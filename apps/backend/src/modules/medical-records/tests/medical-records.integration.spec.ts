import { randomUUID } from 'node:crypto'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, CouncilType, DayOfWeek, MedicalRecordFieldType, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Professional } from '../../professionals/entities/professional.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { MedicalRecordTemplate } from '../../medical-record-templates/entities/medical-record-template.entity'
import { MedicalRecord } from '../entities/medical-record.entity'
import { CacheService } from '../../../cache/cache.service'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000099'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('MedicalRecordsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Professional>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let cacheService: CacheService
  let templateRepository: Repository<MedicalRecordTemplate>
  let recordRepository: Repository<MedicalRecord>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let otherSpecialtyDoctorToken: string
  let userToken: string
  let professionalId: string
  let otherDoctorId: string
  let patientId: string
  let specialtyId: string
  let appointmentId: string
  let templateId: string
  let templateFields: any[]

  const password = 'Password123!'

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    doctorRepository = module.get(getRepositoryToken(Professional))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
    cacheService = module.get(CacheService)
    templateRepository = module.get(getRepositoryToken(MedicalRecordTemplate))
    recordRepository = module.get(getRepositoryToken(MedicalRecord))
  })

  beforeEach(async () => {
    await recordRepository.query('DELETE FROM test.medical_records')
    await recordRepository.query('DELETE FROM test.medical_record_templates')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.professional_specialties')
    await doctorRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Medical Records Clinic',
        slug: 'mr-clinic',
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@mr.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@mr.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@mr.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherSpecialtyDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Nutritionist Doe',
        email: 'nutri@mr.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@mr.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Cardiologia' }),
    )
    specialtyId = specialty.id

    const otherSpecialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Nutrição' }),
    )

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }] as any
    doctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const doctorProfile = await doctorRepository.save(doctorEntity)
    professionalId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true }] as any
    otherDoctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    // Exerce outra especialidade — é ele quem prova que o recorte por
    // especialidade recorta mesmo. `otherDoctor` divide a Cardiologia com o
    // autor e por isso enxerga o prontuário dele.
    const otherSpecialtyDoctorEntity = doctorRepository.create({
      userId: otherSpecialtyDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherSpecialtyDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRN, number: '77777', state: 'SP', isPrimary: true }] as any
    otherSpecialtyDoctorEntity.professionalSpecialties = ([otherSpecialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    await doctorRepository.save(otherSpecialtyDoctorEntity)

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@mr.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    const patientRecord = await patientRepository.save(
      patientRepository.create({
        userId: patientUser.id,
        clinicId: SEED_CLINIC_ID,
        documentNumber: faker.string.numeric(11),
        phoneNumber: faker.string.numeric(11),
        birthDate: '1990-01-01',
        gender: PatientGender.FEMALE,
      }),
    )
    patientId = patientRecord.id

    const schedule = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )

    const appointment = await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId,
        patientId,
        specialtyId,
        scheduleId: schedule.id,
        date: '2026-01-05',
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.SCHEDULED,
        reason: null,
        cancellationReason: null,
      }),
    )
    appointmentId = appointment.id

    templateFields = [
      {
        key: 'weight_abc1',
        label: 'Peso',
        type: MedicalRecordFieldType.NUMBER,
        required: false,
        order: 1,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      },
      {
        key: 'notes_def2',
        label: 'Observações',
        type: MedicalRecordFieldType.TEXTAREA,
        required: false,
        order: 2,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      },
    ]

    const template = await templateRepository.save(
      templateRepository.create({
        clinicId: SEED_CLINIC_ID,
        specialtyId,
        name: 'Prontuário Cardiologia',
        fields: templateFields,
        isActive: true,
      }),
    )
    templateId = template.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: 'mr-clinic' })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token_mr-clinic='))
      return match ? match.slice('access_token_mr-clinic='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@mr.test')
    doctorToken = await loginAndExtractToken('doctor@mr.test')
    otherDoctorToken = await loginAndExtractToken('other@mr.test')
    otherSpecialtyDoctorToken = await loginAndExtractToken('nutri@mr.test')
    userToken = await loginAndExtractToken('user@mr.test')
  })

  afterAll(async () => {
    await recordRepository.query('DELETE FROM test.medical_records')
    await recordRepository.query('DELETE FROM test.medical_record_templates')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.professional_specialties')
    await doctorRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  describe('POST /medical-records', () => {
    it('returns 201 with created record inheriting specialtyId from appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { weight_abc1: 75 } })
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.appointmentId).toBe(appointmentId)
      expect(body.specialtyId).toBe(specialtyId)
      expect(body.templateId).toBe(templateId)
      expect(body.patientId).toBe(patientId)
      expect(body.professionalId).toBe(professionalId)
      expect(body.patientName).toBe('Patient Jones')
      expect(body.professionalName).toBe('Doctor Smith')
      expect(body.specialtyName).toBe('Cardiologia')
      expect(body.templateSchemaSnapshot).toHaveLength(2)
    })

    it('snapshot matches template fields at creation time', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)

      expect(body.templateSchemaSnapshot[0].key).toBe('weight_abc1')
      expect(body.templateSchemaSnapshot[1].key).toBe('notes_def2')
    })

    it('DOCTOR can create record for own appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)
    })

    it('returns 403 when DOCTOR creates for another doctor appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(403)
    })

    it('returns 422 when data has required field missing', async () => {
      const requiredField = {
        key: 'complaint_xxx1',
        label: 'Queixa',
        type: MedicalRecordFieldType.TEXT,
        required: true,
        order: 3,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      }
      await templateRepository.update(templateId, { fields: [...templateFields, requiredField] })

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(422)
    })

    it('returns 422 when data has unknown field key', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { unknown_field: 'value' } })
        .expect(422)
    })

    it('returns 422 when data has wrong type', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { weight_abc1: 'not-a-number' } })
        .expect(422)
    })

    it('returns 409 when medical record already exists for appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(409)
    })

    it('returns 404 for a generalist appointment when no generalist template exists', async () => {
      const noSpecAppt = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          specialtyId: null,
          scheduleId: (await scheduleRepository.findOneByOrFail({ professionalId })).id,
          date: '2026-01-06',
          startTime: '09:00',
          endTime: '09:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId: noSpecAppt.id, templateId: randomUUID(), data: {} })
        .expect(404)
    })

    it('creates a generalist record (null specialty) via the clinic generalist template', async () => {
      const generalistTemplate = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          specialtyId: null,
          councilType: CouncilType.CRM,
          name: 'Prontuário clínico geral',
          fields: templateFields,
          isActive: true,
        }),
      )

      const generalistAppt = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          specialtyId: null,
          scheduleId: (await scheduleRepository.findOneByOrFail({ professionalId })).id,
          date: '2026-01-07',
          startTime: '09:30',
          endTime: '10:00',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId: generalistAppt.id, templateId: generalistTemplate.id, data: {} })
        .expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.specialtyName).toBeNull()
    })

    it('returns 403 for USER role', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${userToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(403)
    })

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .send({ appointmentId, templateId, data: {} })
        .expect(401)
    })

    it('returns 400 when templateId is missing', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(400)
    })

    it('returns 404 when the template belongs to another clinic', async () => {
      const otherClinic = await clinicRepository.save(
        clinicRepository.create({ name: 'Outra', slug: 'mr-outra', isActive: true }),
      )
      const alheio = await templateRepository.save(
        templateRepository.create({
          clinicId: otherClinic.id,
          specialtyId,
          name: 'Alheio',
          fields: templateFields,
          isActive: true,
        }),
      )

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId: alheio.id, data: {} })
        .expect(404)
    })

    it('returns 422 when the chosen template is inactive', async () => {
      await templateRepository.update(templateId, { isActive: false })

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(422)
    })

    it('returns 422 when the chosen template is from another specialty', async () => {
      const outra = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Dermatologia' }),
      )
      const deOutra = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          specialtyId: outra.id,
          name: 'Prontuário Dermatologia',
          fields: templateFields,
          isActive: true,
        }),
      )

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId: deOutra.id, data: {} })
        .expect(422)
    })

    // A FK composta é MATCH SIMPLE: com specialty nula dos dois lados o banco
    // nem checa. Aqui a validação do use-case é a única barreira.
    it('returns 422 when a generalist template belongs to another profession', async () => {
      const doNutricionista = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          specialtyId: null,
          councilType: CouncilType.CRN,
          name: 'Prontuário de Nutrição',
          fields: templateFields,
          isActive: true,
        }),
      )
      const generalistAppt = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          specialtyId: null,
          scheduleId: (await scheduleRepository.findOneByOrFail({ professionalId })).id,
          date: '2026-01-08',
          startTime: '10:00',
          endTime: '10:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId: generalistAppt.id, templateId: doNutricionista.id, data: {} })
        .expect(422)
    })

    // O teste-âncora: dois modelos na mesma especialidade, e cada prontuário
    // congela o que foi de fato escolhido — não um resolvido pelo servidor.
    it('snapshots whichever of the specialty templates was chosen', async () => {
      const retorno = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          specialtyId,
          name: 'Retorno',
          fields: [
            {
              key: 'evolucao_xy12',
              label: 'Evolução',
              type: MedicalRecordFieldType.TEXTAREA,
              required: false,
              order: 1,
              options: null,
              placeholder: null,
              helpText: null,
              canonical: false,
              canonicalKey: null,
            },
          ],
          isActive: true,
        }),
      )

      const { body: comRetorno } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId: retorno.id, data: { evolucao_xy12: 'estável' } })
        .expect(201)

      expect(comRetorno.templateId).toBe(retorno.id)
      expect(comRetorno.templateSchemaSnapshot.map((f: any) => f.key)).toEqual(['evolucao_xy12'])

      // A outra consulta, com o outro modelo do mesmo escopo.
      const segundaConsulta = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          specialtyId,
          scheduleId: (await scheduleRepository.findOneByOrFail({ professionalId })).id,
          date: '2026-01-09',
          startTime: '10:30',
          endTime: '11:00',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body: comPadrao } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId: segundaConsulta.id, templateId, data: {} })
        .expect(201)

      expect(comPadrao.templateId).toBe(templateId)
      expect(comPadrao.templateSchemaSnapshot.map((f: any) => f.key)).toEqual([
        'weight_abc1',
        'notes_def2',
      ])
    })

    it('enforces FK composta: template specialty must match appointment specialty', async () => {
      // Force a specialty mismatch at DB level by trying direct insert
      const otherSpecialty = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Dermatologia' }),
      )

      await expect(
        recordRepository.query(`
          INSERT INTO test.medical_records
            (clinic_id, appointment_id, patient_id, professional_id, specialty_id, template_id, template_schema_snapshot, data)
          VALUES
            ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '{}'::jsonb)
        `, [SEED_CLINIC_ID, appointmentId, patientId, professionalId, otherSpecialty.id, templateId]),
      ).rejects.toThrow()
    })
  })

  describe('GET /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 200 with record for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(recordId)
    })

    it('returns 200 for DOCTOR (own record)', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)
    })

    // Ler segue a mesma regra da listagem: o que ele escreveu OU o que foi
    // escrito numa especialidade que ele exerce. Antes aqui era 404, e o
    // histórico do paciente listava o prontuário do colega que ninguém
    // conseguia abrir.
    it('returns 200 for DOCTOR from the same specialty', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(200)

      expect(body.id).toBe(recordId)
    })

    it('returns 404 for DOCTOR from another specialty', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${otherSpecialtyDoctorToken}`)
        .expect(404)
    })

    it('returns 404 when record not found', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/00000000-0000-0000-0000-000000000000`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('GET /medical-records/by-appointment/:appointmentId', () => {
    it('returns 404 when no record exists for appointment', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns record when it exists', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.appointmentId).toBe(appointmentId)
    })

    it('returns 403 when DOCTOR checks another doctor appointment', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })
  })

  describe('GET /medical-records?patientId=...', () => {
    it('returns paginated records for ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .query({ patientId })
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.total).toBe(1)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('DOCTOR sees only own records', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .query({ patientId })
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].professionalId).toBe(professionalId)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${userToken}`)
        .query({ patientId })
        .expect(403)
    })
  })

  describe('PATCH /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 200 with updated record', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ notes: 'Updated notes' })
        .expect(200)

      expect(body.notes).toBe('Updated notes')
    })

    it('DOCTOR can update own record', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ notes: 'Doctor notes' })
        .expect(200)
    })

    it('returns 403 when DOCTOR updates another doctor record', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({ notes: 'Hacked' })
        .expect(403)
    })

    it('returns 422 when appointment is completed', async () => {
      await appointmentRepository.update(appointmentId, { status: AppointmentStatus.COMPLETED })

      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ data: { weight_abc1: 80 } })
        .expect(422)
    })

    it('validates data against snapshot (not current template)', async () => {
      await templateRepository.update(templateId, {
        fields: [
          ...templateFields,
          {
            key: 'new_field_xyz9',
            label: 'New Field',
            type: MedicalRecordFieldType.TEXT,
            required: false,
            order: 3,
            options: null,
            placeholder: null,
            helpText: null,
            canonical: false,
            canonicalKey: null,
          },
        ],
      })

      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ data: { new_field_xyz9: 'value' } })
        .expect(422)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .send({ notes: 'x' })
        .expect(403)
    })
  })

  describe('DELETE /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 204 for ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const deleted = await recordRepository.findOne({ where: { id: recordId }, withDeleted: true })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 403 for DOCTOR', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(403)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when record not found', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/00000000-0000-0000-0000-000000000000`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })
  })
  describe('GET /medical-records — histórico por especialidade', () => {
    // O recorte que a aba de histórico da consulta usa.
    it('filtra por especialidade', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { weight_abc1: 75 } })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}&specialtyId=${specialtyId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data.every((r: { specialtyId: string }) => r.specialtyId === specialtyId)).toBe(true)
    })

    it('exclui a consulta atual do próprio histórico', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}&excludeAppointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data.every((r: { appointmentId: string }) => r.appointmentId !== appointmentId)).toBe(true)
    })

    // Data e horário do ATENDIMENTO, não do registro: é o que situa a consulta
    // no tempo para quem lê o histórico.
    it('devolve data e horário do atendimento', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { weight_abc1: 75 } })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data.length).toBeGreaterThan(0)
      expect(body.data[0]).toHaveProperty('appointmentDate')
      expect(body.data[0]).toHaveProperty('appointmentStartTime')
      expect(body.data[0].appointmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    // Decisão de produto: atendimento excluído não aparece no histórico. O
    // INNER JOIN em `baseQuery` faz o TypeORM acrescentar `deleted_at IS NULL`
    // ao join, e o prontuário some junto com a consulta.
    //
    // A limpeza de cache abaixo não é maquiagem: a listagem guarda o resultado
    // por 60s e a chave não muda quando a consulta é excluída, então sem isso o
    // teste leria a resposta anterior. Na prática a janela é inofensiva —
    // nenhum fluxo exclui consulta hoje (o repositório de appointments não tem
    // delete; a interface cancela, que é status, não exclusão).
    it('não devolve prontuário de consulta excluída', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, templateId, data: { weight_abc1: 75 } })
        .expect(201)

      const { body: antes } = await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)
      expect(antes.total).toBe(1)

      await appointmentRepository.softDelete(appointmentId)
      await cacheService.delByPattern('medical_records:*')

      const { body: depois } = await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)
      expect(depois.total).toBe(0)
      expect(depois.data).toHaveLength(0)
    })

    it('400 quando specialtyId não é uuid nem "null"', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}&specialtyId=abc`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(400)
    })

    it('aceita specialtyId=null para o caso generalista', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records?patientId=${patientId}&specialtyId=null`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)
    })
  })

})
