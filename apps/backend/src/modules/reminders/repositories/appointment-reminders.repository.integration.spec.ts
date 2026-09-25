import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { NotificationChannel } from '@app/shared'
import { AppointmentReminder } from '../entities/appointment-reminder.entity'
import { AppointmentRemindersRepository } from './appointment-reminders.repository'

const DB_HOST = process.env.DB_HOST ?? 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT ?? '5499', 10)
const DB_USER = process.env.DB_USER ?? 'postgres'
const DB_PASS = process.env.DB_PASS ?? 'postgres'
const DB_NAME = process.env.DB_NAME ?? 'app'

describe('AppointmentRemindersRepository (integration)', () => {
  let dataSource: DataSource
  let repository: AppointmentRemindersRepository

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      schema: 'test',
      entities: [AppointmentReminder],
      synchronize: false,
    })
    await dataSource.initialize()
    repository = new AppointmentRemindersRepository(dataSource.getRepository(AppointmentReminder))
  })

  afterEach(async () => {
    await dataSource.query('DELETE FROM test.appointment_reminders')
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  describe('claim (send-once via ON CONFLICT)', () => {
    it('claims a reminder slot once and returns the row', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const first = await repository.claim(appointmentId, clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      expect(first).not.toBeNull()
      expect(first!.id).toBeDefined()
      expect(first!.status).toBe('pending')
    })

    it('returns null on a duplicate (appointment, offset, channel) claim', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const first = await repository.claim(appointmentId, clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      const second = await repository.claim(appointmentId, clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')

      expect(first).not.toBeNull()
      expect(second).toBeNull()
    })

    it('allows the same appointment to be claimed for a different offset', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const at24 = await repository.claim(appointmentId, clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      const at3 = await repository.claim(appointmentId, clinicId, '3h', NotificationChannel.WHATSAPP, 'pending')

      expect(at24).not.toBeNull()
      expect(at3).not.toBeNull()
    })
  })

  describe('mark* / release', () => {
    it('finalizes a claimed reminder as sent / failed, and release deletes the row', async () => {
      const clinicId = faker.string.uuid()
      const sent = await repository.claim(faker.string.uuid(), clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      const failed = await repository.claim(faker.string.uuid(), clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      const released = await repository.claim(faker.string.uuid(), clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')

      await repository.markSent(sent!.id, 'provider-msg-1')
      await repository.markFailed(failed!.id, 'boom')
      await repository.release(released!.id)

      const rows = await dataSource.getRepository(AppointmentReminder).find()
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
      expect(byId[sent!.id].status).toBe('sent')
      expect(byId[sent!.id].providerMessageId).toBe('provider-msg-1')
      expect(byId[failed!.id].status).toBe('failed')
      expect(byId[failed!.id].error).toBe('boom')
      expect(byId[released!.id]).toBeUndefined() // row deleted → can be re-claimed
    })

    it('a released claim can be claimed again for the same (appointment, offset)', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const first = await repository.claim(appointmentId, clinicId, '3h', NotificationChannel.WHATSAPP, 'pending')
      await repository.release(first!.id)
      const second = await repository.claim(appointmentId, clinicId, '3h', NotificationChannel.WHATSAPP, 'pending')

      expect(second).not.toBeNull()
    })
  })

  // O canal entrou na unique: sem isso o primeiro canal a enviar reivindicaria o
  // slot e o segundo nunca sairia — silenciosamente, porque um claim nulo é
  // indistinguível de outra instância ter ganhado a corrida.
  describe('claim across channels', () => {
    it('allows the same (appointment, offset) on a different channel', async () => {
      const appointmentId = faker.string.uuid()
      const clinicId = faker.string.uuid()

      const whatsapp = await repository.claim(appointmentId, clinicId, '24h', NotificationChannel.WHATSAPP, 'pending')
      const other = await repository.claim(appointmentId, clinicId, '24h', 'email' as NotificationChannel, 'pending')

      expect(whatsapp).not.toBeNull()
      expect(other).not.toBeNull()
      expect(other!.id).not.toBe(whatsapp!.id)
    })
  })

  describe('findDueCandidates — o opt-in por clínica', () => {
    const DATE = '2031-03-14'

    // Cada spec limpa só o que criou. Um DELETE amplo apagaria linhas de outros
    // specs e trava na FK de prontuários — e, ao estourar, deixa o resto para
    // trás e envenena as suítes seguintes.
    const created: Array<Record<string, string>> = []

    async function seedAppointment(): Promise<{ clinicId: string; appointmentId: string }> {
      const ids = {
        clinic: faker.string.uuid(),
        patientUser: faker.string.uuid(),
        patient: faker.string.uuid(),
        professionalUser: faker.string.uuid(),
        professional: faker.string.uuid(),
        schedule: faker.string.uuid(),
        appointment: faker.string.uuid(),
      }
      const slug = `optin-${faker.string.alphanumeric(8).toLowerCase()}`

      await dataSource.query(
        `INSERT INTO test.clinics (id, name, slug, is_active) VALUES ($1, 'Clínica Opt-In', $2, true)`,
        [ids.clinic, slug],
      )
      await dataSource.query(
        `INSERT INTO test.users (id, full_name, email, password, role, clinic_id)
         VALUES ($1, 'Maria Paciente', $2, 'x', 'patient', $3), ($4, 'Dra. Ana', $5, 'x', 'professional', $3)`,
        [ids.patientUser, `${slug}.p@optin.test`, ids.clinic, ids.professionalUser, `${slug}.d@optin.test`],
      )
      await dataSource.query(
        `INSERT INTO test.patients (id, user_id, clinic_id, phone_number, birth_date, gender)
         VALUES ($1, $2, $3, '11998877665', '1990-01-01', 'female')`,
        [ids.patient, ids.patientUser, ids.clinic],
      )
      await dataSource.query(
        `INSERT INTO test.professionals (id, user_id, clinic_id) VALUES ($1, $2, $3)`,
        [ids.professional, ids.professionalUser, ids.clinic],
      )
      await dataSource.query(
        `INSERT INTO test.schedules (id, professional_id, clinic_id, day_of_week, start_time, end_time, slot_duration_in_minutes)
         VALUES ($1, $2, $3, 'FRIDAY', '08:00', '18:00', 30)`,
        [ids.schedule, ids.professional, ids.clinic],
      )
      await dataSource.query(
        `INSERT INTO test.appointments (id, clinic_id, professional_id, patient_id, schedule_id, date, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, '09:00', '09:30', 'scheduled')`,
        [ids.appointment, ids.clinic, ids.professional, ids.patient, ids.schedule, DATE],
      )

      created.push(ids)
      return { clinicId: ids.clinic, appointmentId: ids.appointment }
    }

    async function enableChannel(clinicId: string, channel: string): Promise<void> {
      await dataSource.query(
        `INSERT INTO test.clinic_notification_channels (clinic_id, channel) VALUES ($1, $2)`,
        [clinicId, channel],
      )
    }

    afterEach(async () => {
      // Ordem inversa das FKs, e sempre por id.
      for (const ids of created) {
        await dataSource.query('DELETE FROM test.appointments WHERE id = $1', [ids.appointment])
        await dataSource.query('DELETE FROM test.schedules WHERE id = $1', [ids.schedule])
        await dataSource.query('DELETE FROM test.professionals WHERE id = $1', [ids.professional])
        await dataSource.query('DELETE FROM test.patients WHERE id = $1', [ids.patient])
        await dataSource.query('DELETE FROM test.clinic_notification_channels WHERE clinic_id = $1', [ids.clinic])
        await dataSource.query('DELETE FROM test.users WHERE id IN ($1, $2)', [ids.patientUser, ids.professionalUser])
        await dataSource.query('DELETE FROM test.clinics WHERE id = $1', [ids.clinic])
      }
      created.length = 0
    })

    // Este é o coração da mudança: sem vínculo, a clínica não produz candidato.
    // Antes, toda clínica ativa produzia — e ligar a flag global teria disparado
    // WhatsApp para as pacientes de todas elas.
    it('não devolve candidato para clínica sem canal habilitado', async () => {
      await seedAppointment()

      expect(await repository.findDueCandidates(DATE, DATE)).toEqual([])
    })

    it('devolve o candidato com o canal e o nome da clínica quando habilitado', async () => {
      const { clinicId, appointmentId } = await seedAppointment()
      await enableChannel(clinicId, NotificationChannel.WHATSAPP)

      const candidates = await repository.findDueCandidates(DATE, DATE)

      expect(candidates).toHaveLength(1)
      expect(candidates[0]).toMatchObject({
        appointmentId,
        clinicId,
        clinicName: 'Clínica Opt-In',
        channel: NotificationChannel.WHATSAPP,
        startTime: '09:00',
        patientName: 'Maria Paciente',
        patientPhone: '11998877665',
        professionalName: 'Dra. Ana',
      })
    })

    // A projeção abre em leque: dois canais habilitados, dois candidatos para a
    // mesma consulta — é assim que o multi-canal chega ao use-case.
    it('abre um candidato por canal habilitado', async () => {
      const { clinicId } = await seedAppointment()
      await enableChannel(clinicId, NotificationChannel.WHATSAPP)
      await enableChannel(clinicId, 'email')

      const candidates = await repository.findDueCandidates(DATE, DATE)

      expect(candidates).toHaveLength(2)
      expect(candidates.map((c) => c.channel).sort()).toEqual(['email', 'whatsapp'])
    })

    // O JOIN com clinics não foi substituído — ele continua aplicando is_active.
    it('ignora clínica inativa mesmo com canal habilitado', async () => {
      const { clinicId } = await seedAppointment()
      await enableChannel(clinicId, NotificationChannel.WHATSAPP)
      await dataSource.query(`UPDATE test.clinics SET is_active = false WHERE id = $1`, [clinicId])

      expect(await repository.findDueCandidates(DATE, DATE)).toEqual([])
    })
  })
})
