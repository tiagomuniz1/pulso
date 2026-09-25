import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { AppointmentStatus, DayOfWeek, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { importIClinic } from './import-iclinic'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

const MAIN_SLUG = `brenna-${Date.now()}`
const ORTHO_SLUG = `yago-${Date.now()}`
const MAIN_EMAIL = `brenna.${Date.now()}@e2e.test`
const ORTHO_EMAIL = `yago.${Date.now()}@e2e.test`

/** Data futura estável: sempre a próxima terça, para casar com a agenda criada. */
function nextTuesday(): string {
  const date = new Date()
  date.setDate(date.getDate() + ((9 - date.getDay()) % 7 || 7))
  return date.toISOString().slice(0, 10)
}

const FUTURE_DATE = nextTuesday()
const TODAY = new Date().toISOString().slice(0, 10)

describe('importIClinic (integration)', () => {
  let dataSource: DataSource
  let dir: string

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    dataSource = module.get(DataSource)

    await seedScenario(dataSource)
    dir = writeFixtures()
  })

  afterAll(async () => {
    fs.rmSync(dir, { recursive: true, force: true })
    await dataSource.destroy()
  })

  function options(dryRun: boolean) {
    return {
      dir,
      clinicSlug: MAIN_SLUG,
      professionalEmail: MAIN_EMAIL,
      orthopedicsClinicSlug: ORTHO_SLUG,
      orthopedicsProfessionalEmail: ORTHO_EMAIL,
      dryRun,
    }
  }

  async function count(table: string, clinicSlug: string): Promise<number> {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM test.${table} t
        JOIN test.clinics c ON c.id = t.clinic_id
        WHERE c.slug = $1 AND t.deleted_at IS NULL`,
      [clinicSlug],
    )
    return total
  }

  it('reports without writing anything on a dry run', async () => {
    const report = await importIClinic(dataSource, options(true))

    expect(report.dryRun).toBe(true)
    expect(report.patients.read).toBe(4)
    // A única paciente do cenário é a que já existia antes da carga — a
    // simulação não acrescentou nenhuma.
    expect(await count('patients', MAIN_SLUG)).toBe(1)
    expect(await count('appointments', MAIN_SLUG)).toBe(0)
    expect(await count('medical_records', MAIN_SLUG)).toBe(0)
  })

  it('loads patients, appointments and records into the right clinic', async () => {
    const report = await importIClinic(dataSource, options(false))

    expect(report.dryRun).toBe(false)
    // 3 pacientes na clínica principal, 1 exclusivo de ortopedia.
    expect(await count('patients', MAIN_SLUG)).toBe(3)
    expect(await count('patients', ORTHO_SLUG)).toBe(1)

    // A consulta de ortopedia foi para a clínica do Yago.
    expect(await count('appointments', ORTHO_SLUG)).toBe(1)
    expect(await count('medical_records', ORTHO_SLUG)).toBe(1)
  })

  it('derives the outcome from the medical record, not from the IClinic code', async () => {
    const [attended] = await dataSource.query(
      `SELECT status FROM test.appointments WHERE external_id = '1001'`,
    )
    expect(attended.status).toBe(AppointmentStatus.COMPLETED)

    const [stale] = await dataSource.query(
      `SELECT status, cancellation_reason FROM test.appointments WHERE external_id = '1003'`,
    )
    expect(stale.status).toBe(AppointmentStatus.CANCELLED)
    expect(stale.cancellation_reason).toContain('sem desfecho registrado')
  })

  it('keeps a future appointment scheduled on the real agenda', async () => {
    const [future] = await dataSource.query(
      `SELECT a.status, a.start_time, s.slot_duration_in_minutes
         FROM test.appointments a JOIN test.schedules s ON s.id = a.schedule_id
        WHERE a.external_id = '1004'`,
    )
    expect(future.status).toBe(AppointmentStatus.SCHEDULED)
    expect(future.start_time).toBe('08:00')
    // Caiu na agenda real (45 min), não na legado (5 min).
    expect(future.slot_duration_in_minutes).toBe(45)
  })

  it('does not cancel an appointment that is still today', async () => {
    const [today] = await dataSource.query(
      `SELECT status, cancellation_reason FROM test.appointments WHERE external_id = '1007'`,
    )
    // Só entra se hoje cair num dia com agenda; quando cai, o que importa é que
    // não foi dada por encerrada.
    if (today) {
      expect(today.status).not.toBe(AppointmentStatus.CANCELLED)
      expect(today.cancellation_reason).toBeNull()
    }
  })

  it('reports a future appointment that does not fit instead of inventing a slot', async () => {
    const [offGrid] = await dataSource.query(
      `SELECT count(*)::int AS total FROM test.appointments WHERE external_id = '1005'`,
    )
    expect(offGrid.total).toBe(0)
  })

  it('converts the clinical HTML to readable plain text', async () => {
    const [record] = await dataSource.query(
      `SELECT data FROM test.medical_records WHERE external_id = '2001'`,
    )
    expect(record.data.conduta).toBe('Solicito exames de sangue')
    expect(record.data.conduta).not.toContain('<')
  })

  it('matches a patient that already existed instead of duplicating her', async () => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM test.patients p
         JOIN test.clinics c ON c.id = p.clinic_id
        WHERE c.slug = $1 AND p.document_number = '03270135408'`,
      [MAIN_SLUG],
    )
    expect(total).toBe(1)

    const [existing] = await dataSource.query(
      `SELECT external_id FROM test.patients WHERE document_number = '03270135408'`,
    )
    expect(existing.external_id).toBe('9004')
  })

  it('turns the blocked day into a schedule exception', async () => {
    const [{ total }] = await dataSource.query(
      `SELECT count(*)::int AS total FROM test.schedule_exceptions WHERE date = '2025-06-02'`,
    )
    expect(total).toBe(1)
  })

  it('is idempotent — a second run creates nothing new', async () => {
    const before = await count('appointments', MAIN_SLUG)

    const report = await importIClinic(dataSource, options(false))

    expect(report.patients.created).toBe(0)
    expect(report.appointments.created).toBe(0)
    expect(report.medicalRecords.created).toBe(0)
    expect(await count('appointments', MAIN_SLUG)).toBe(before)
  })
})

// ------------------------------------------------------------------ cenário

async function seedScenario(dataSource: DataSource): Promise<void> {
  const [gyn] = await dataSource.query(
    `INSERT INTO test.specialties (id, name, description, title_name)
     VALUES ($1, 'Ginecologia e Obstetrícia', 'x', 'ginecologista')
     ON CONFLICT DO NOTHING RETURNING id`,
    [randomUUID()],
  ).then(async (rows: { id: string }[]) =>
    rows.length > 0
      ? rows
      : dataSource.query(`SELECT id FROM test.specialties WHERE name = 'Ginecologia e Obstetrícia'`),
  )

  const [ortho] = await dataSource.query(
    `INSERT INTO test.specialties (id, name, description, title_name)
     VALUES ($1, 'Ortopedia e Traumatologia', 'x', 'ortopedista')
     ON CONFLICT DO NOTHING RETURNING id`,
    [randomUUID()],
  ).then(async (rows: { id: string }[]) =>
    rows.length > 0
      ? rows
      : dataSource.query(`SELECT id FROM test.specialties WHERE name = 'Ortopedia e Traumatologia'`),
  )

  await createClinicWithProfessional(dataSource, MAIN_SLUG, MAIN_EMAIL, gyn.id, true)
  await createClinicWithProfessional(dataSource, ORTHO_SLUG, ORTHO_EMAIL, ortho.id, false)
}

async function createClinicWithProfessional(
  dataSource: DataSource,
  slug: string,
  email: string,
  specialtyId: string,
  withRealSchedule: boolean,
): Promise<void> {
  const clinicId = randomUUID()
  const userId = randomUUID()
  const professionalId = randomUUID()

  await dataSource.query(
    `INSERT INTO test.clinics (id, name, slug, is_active) VALUES ($1, $2, $3, true)`,
    [clinicId, slug, slug],
  )
  await dataSource.query(
    `INSERT INTO test.users (id, full_name, email, password, role, is_active, clinic_id)
     VALUES ($1, $2, $3, 'hash', $4, true, $5)`,
    [userId, `Dr(a). ${slug}`, email, UserRole.ADMIN, clinicId],
  )
  await dataSource.query(
    `INSERT INTO test.professionals (id, user_id, clinic_id) VALUES ($1, $2, $3)`,
    [professionalId, userId, clinicId],
  )
  await dataSource.query(
    `INSERT INTO test.professional_registrations (id, professional_id, clinic_id, council_type, number, state, is_primary)
     VALUES ($1, $2, $3, 'crm', $4, 'PB', true)`,
    [randomUUID(), professionalId, clinicId, String(Date.now()).slice(-6)],
  )
  await dataSource.query(
    `INSERT INTO test.clinic_specialties (id, clinic_id, specialty_id) VALUES ($1, $2, $3)`,
    [randomUUID(), clinicId, specialtyId],
  )
  await dataSource.query(
    `INSERT INTO test.professional_specialties (id, professional_id, specialty_id) VALUES ($1, $2, $3)`,
    [randomUUID(), professionalId, specialtyId],
  )

  if (withRealSchedule) {
    // Agenda real: terça, 08:00–12:30, slots de 45 min — a grade que o acervo revela.
    await dataSource.query(
      `INSERT INTO test.schedules (id, professional_id, clinic_id, day_of_week, start_time, end_time, slot_duration_in_minutes, valid_from)
       VALUES ($1, $2, $3, $4, '08:00', '12:30', 45, $5)`,
      [randomUUID(), professionalId, clinicId, DayOfWeek.TUESDAY, new Date().toISOString().slice(0, 10)],
    )

    // Uma paciente que já existe no Pulso, sem origem externa — o importador
    // tem de casá-la, não duplicá-la.
    const existingUserId = randomUUID()
    await dataSource.query(
      `INSERT INTO test.users (id, full_name, email, password, role, is_active, clinic_id)
       VALUES ($1, 'Ana Maria de Lima Neves Vieira', $2, 'hash', $3, false, $4)`,
      [existingUserId, `ana.${Date.now()}@e2e.test`, UserRole.PATIENT, clinicId],
    )
    await dataSource.query(
      `INSERT INTO test.patients (id, user_id, clinic_id, document_number, phone_number, birth_date, gender)
       VALUES ($1, $2, $3, '03270135408', '(83) 99846-7266', '1979-08-01', $4)`,
      [randomUUID(), existingUserId, clinicId, PatientGender.FEMALE],
    )
  }
}

function writeFixtures(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iclinic-import-'))

  fs.writeFileSync(
    path.join(dir, 'x-patient.csv'),
    [
      'patient_id,name,birthdate,gender,cpf,mobile_phone,home_phone,email,zip_code,address,number,complement,neighborhood,city,state,country,date_added',
      '9001,Mykaelle Nicandro Pereira,2001-05-30,f,11392731402,(83) 98640-4309,,mykaelle@example.com,58625-000,Rua: Pedro Melquiades,05,,Centro,São Mamede,PB,BR,2025-06-10T23:09:35+00:00',
      '9002,Joaquim Ortopedia,1996-10-20,m,,(83) 99999-0000,,,58700-000,Rua São José,340,,Centro,Patos,PB,BR,2025-06-11T10:00:00+00:00',
      '9003,Beatriz Sem Email,1990-01-01,f,08401570450,(83) 98888-0000,,,,,,,,,,BR,2025-06-12T10:00:00+00:00',
      '9004,Ana Maria de Lima Neves Vieira,1979-08-01,f,03270135408,(83) 99846-7266,,ana@example.com,,,,,,,,BR,2025-06-13T10:00:00+00:00',
    ].join('\n') + '\n',
  )

  const scheduling = [
    'pk,patient_id,patient_name,date,start_time,end_time,status,description,all_day,event_blocked_scheduling,procedure_pack',
    // atendida, com prontuário
    '1001,9001,Mykaelle,2025-06-11,08:00:00,08:45:00,cp,CONSULTA PRÉ NATAL,,,"json::[{""name"": ""Consulta pré-natal""}]"',
    // ortopedia, com prontuário
    '1002,9002,Joaquim,2025-06-18,09:00:00,09:30:00,cp,CONSULTA ORTOPEDIA,,,"json::[{""name"": ""Consulta ortopedia""}]"',
    // passada sem desfecho
    '1003,9003,Beatriz,2025-07-01,10:00:00,10:45:00,sc,RETORNO,,,"json::[{""name"": ""Retorno Ginecológico""}]"',
    // futura que cabe na grade
    `1004,9001,Mykaelle,${FUTURE_DATE},08:00:00,08:45:00,sc,CONSULTA,,,"json::[{""name"": ""Consulta Ginecológica""}]"`,
    // futura fora da grade
    `1005,9003,Beatriz,${FUTURE_DATE},13:37:00,14:00:00,sc,ENCAIXE,,,"json::[{""name"": ""Consulta Ginecológica""}]"`,
    // bloqueio de agenda
    '1006,,,2025-06-02,08:00:00,18:00:00,sc,Não agendar (plantão),Sim,1,',
    // consulta de HOJE, sem prontuário — não pode virar cancelada
    `1007,9001,Mykaelle,${TODAY},08:00:00,08:45:00,sc,CONSULTA HOJE,,,"json::[{""name"": ""Consulta Ginecológica""}]"`,
  ].join('\n')
  fs.writeFileSync(path.join(dir, 'x-event_scheduling.csv'), scheduling + '\n')

  const records = [
    'pk,patient_id,date,start_time,end_time,procedure_pack,eventblock_pack',
    '2001,9001,2025-06-11,08:00:00,08:45:00,"json::[{""name"": ""Consulta pré-natal""}]","json::{""block"": [{""name"": ""Conduta"", ""kind"": ""lt"", ""tab"": ""ATENDIMENTO GINECOLOGICO"", ""value"": ""<p>Solicito exames de sangue</p>"", ""date_added"": ""2025-06-11T08:30:00+00:00""}]}"',
    '2002,9002,2025-06-18,09:00:00,09:30:00,"json::[{""name"": ""Consulta ortopedia""}]","json::{""block"": [{""name"": ""CONDUTA"", ""kind"": ""lt"", ""tab"": ""CONSULTA ORTOPEDIA"", ""value"": ""<p>Fisioterapia</p>"", ""date_added"": ""2025-06-18T09:20:00+00:00""}]}"',
  ].join('\n')
  fs.writeFileSync(path.join(dir, 'x-event_record.csv'), records + '\n')

  return dir
}
