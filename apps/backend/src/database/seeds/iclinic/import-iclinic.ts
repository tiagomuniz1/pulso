import { DataSource, QueryRunner } from 'typeorm'
import {
  AppointmentInsuranceType,
  AppointmentLabelColor,
  AppointmentStatus,
  DayOfWeek,
  UserRole,
} from '@app/shared'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { Appointment } from '../../../modules/appointments/entities/appointment.entity'
import { AppointmentLabel } from '../../../modules/appointment-labels/entities/appointment-label.entity'
import { MedicalRecord } from '../../../modules/medical-records/entities/medical-record.entity'
import { MedicalRecordTemplate } from '../../../modules/medical-record-templates/entities/medical-record-template.entity'
import { Patient } from '../../../modules/patients/entities/patient.entity'
import { Schedule } from '../../../modules/schedules/entities/schedule.entity'
import { ScheduleException } from '../../../modules/schedule-exceptions/entities/schedule-exception.entity'
import { User } from '../../../modules/users/entities/user.entity'
import { generateSlots } from '../../../modules/appointments/utils/slot.util'
import {
  IClinicRecordRow,
  IClinicSchedulingRow,
  readPatients,
  readRecords,
  readSchedulings,
} from './iclinic-csv.parser'
import {
  EXTERNAL_SOURCE,
  MappedPatient,
  dedupeEmails,
  mapPatient,
  normalizeName,
} from './map-patient'
import {
  isBlockingEvent,
  mapStatus,
  resolveLabelName,
  resolveOwner,
  toShortTime,
} from './map-appointment'
import { mapMedicalRecord } from './map-medical-record'
import { ICLINIC_TEMPLATES } from './iclinic-templates'
import { ClinicTarget, ImportContext, resolveImportContext } from './resolve-import-context'
import { ImportOptions, ImportReport, emptyReport, formatReport } from './import-iclinic.types'

/** Onde o histórico começa. Antes disto o acervo não tem nada. */
const LEGACY_SCHEDULE_FROM = '2025-06-01'
/** Slot de 5 min cobre 100% dos horários do acervo — todos são múltiplos de 5. */
const LEGACY_SLOT_MINUTES = 5
const LEGACY_START = '07:00'
const LEGACY_END = '20:00'

const WEEKDAYS: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
]

const LABEL_PALETTE = Object.values(AppointmentLabelColor)

export async function importIClinic(
  dataSource: DataSource,
  options: ImportOptions,
): Promise<ImportReport> {
  const log = options.logger ?? (() => undefined)
  const report = emptyReport(options.dryRun)

  const context = await resolveImportContext(dataSource, options)
  log(`[iclinic] destino principal: ${context.main.clinicSlug} / ${context.main.professionalName}`)
  log(`[iclinic] destino ortopedia: ${context.orthopedics.clinicSlug} / ${context.orthopedics.professionalName}`)

  const patientRows = readPatients(options.dir)
  const schedulingRows = readSchedulings(options.dir)
  const recordRows = readRecords(options.dir)
  log(`[iclinic] lidos: ${patientRows.length} pacientes, ${schedulingRows.length} eventos, ${recordRows.length} prontuários`)

  const queryRunner = dataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    const templateIds = await ensureTemplates(queryRunner, context, report, options.dryRun)
    const labelIds = await ensureLabels(queryRunner, context, schedulingRows, report, options.dryRun)
    const legacyScheduleIds = await ensureLegacySchedules(queryRunner, context, options.dryRun)

    const ownerByPatient = resolveOwnerByPatient(schedulingRows, recordRows)
    const patientIds = await importPatients(
      queryRunner,
      context,
      patientRows,
      ownerByPatient,
      report,
      options.dryRun,
    )

    await importScheduleExceptions(queryRunner, context, schedulingRows, report, options.dryRun)

    const appointmentIds = await importAppointments(
      queryRunner,
      context,
      schedulingRows,
      recordRows,
      patientIds,
      labelIds,
      legacyScheduleIds,
      report,
      options.dryRun,
    )

    await importMedicalRecords(
      queryRunner,
      context,
      recordRows,
      patientIds,
      appointmentIds,
      templateIds,
      report,
      options.dryRun,
    )

    if (options.dryRun) {
      await queryRunner.rollbackTransaction()
      log('[iclinic] simulação: transação revertida, nada gravado')
    } else {
      await queryRunner.commitTransaction()
      log('[iclinic] transação confirmada')
    }
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await queryRunner.release()
  }

  log(formatReport(report))
  return report
}

// ---------------------------------------------------------------- catálogos

async function ensureTemplates(
  queryRunner: QueryRunner,
  context: ImportContext,
  report: ImportReport,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const repo = queryRunner.manager.getRepository(MedicalRecordTemplate)
  const ids = new Map<string, string>()

  for (const definition of ICLINIC_TEMPLATES) {
    report.templates.read += 1
    const target = definition.scope === 'orthopedics' ? context.orthopedics : context.main

    const existing = await repo
      .createQueryBuilder('template')
      .where('template.clinic_id = :clinicId', { clinicId: target.clinicId })
      .andWhere('template.specialty_id = :specialtyId', { specialtyId: target.specialtyId })
      .andWhere('LOWER(TRIM(template.name)) = LOWER(TRIM(:name))', { name: definition.name })
      .andWhere('template.deleted_at IS NULL')
      .getOne()

    if (existing) {
      ids.set(definition.tab, existing.id)
      report.templates.matched += 1
      continue
    }

    const id = randomUUID()
    ids.set(definition.tab, id)
    report.templates.created += 1
    if (dryRun) continue

    await repo.insert({
      id,
      clinicId: target.clinicId,
      specialtyId: target.specialtyId,
      councilType: null,
      name: definition.name,
      fields: definition.fields,
      sections: [],
      isActive: true,
    })
  }

  return ids
}

async function ensureLabels(
  queryRunner: QueryRunner,
  context: ImportContext,
  schedulings: IClinicSchedulingRow[],
  report: ImportReport,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const repo = queryRunner.manager.getRepository(AppointmentLabel)
  const ids = new Map<string, string>()

  // Nome do procedimento → clínica dona, na ordem em que aparecem no export.
  const wanted = new Map<string, ClinicTarget>()
  for (const row of schedulings) {
    const name = resolveLabelName(row.procedures)
    if (!name) continue
    const target = resolveOwner(row.procedures) === 'orthopedics' ? context.orthopedics : context.main
    if (!wanted.has(name)) wanted.set(name, target)
  }

  let paletteIndex = 0
  for (const [name, target] of wanted) {
    report.labels.read += 1

    const existing = await repo
      .createQueryBuilder('label')
      .where('label.clinic_id = :clinicId', { clinicId: target.clinicId })
      .andWhere('LOWER(TRIM(label.name)) = LOWER(TRIM(:name))', { name })
      .andWhere('label.deleted_at IS NULL')
      .getOne()

    if (existing) {
      ids.set(labelKey(target.clinicId, name), existing.id)
      report.labels.matched += 1
      continue
    }

    const id = randomUUID()
    ids.set(labelKey(target.clinicId, name), id)
    report.labels.created += 1
    // Percorre a paleta em ordem: dezesseis cores, dez rótulos — ninguém repete.
    const color = LABEL_PALETTE[paletteIndex % LABEL_PALETTE.length]
    paletteIndex += 1
    if (dryRun) continue

    await repo.insert({
      id,
      clinicId: target.clinicId,
      name: name.slice(0, 40),
      color,
      isActive: true,
    })
  }

  return ids
}

function labelKey(clinicId: string, name: string): string {
  return `${clinicId}::${name.toLowerCase()}`
}

/**
 * Sete agendas de 5 minutos, fechadas na véspera do go-live, só para dar um
 * `schedule_id` válido ao histórico — a coluna é NOT NULL e os horários do
 * IClinic não cabem em grade uniforme nenhuma.
 */
async function ensureLegacySchedules(
  queryRunner: QueryRunner,
  context: ImportContext,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const repo = queryRunner.manager.getRepository(Schedule)
  const ids = new Map<string, string>()
  const validUntil = yesterdayIso()

  for (const target of [context.main, context.orthopedics]) {
    for (const dayOfWeek of WEEKDAYS) {
      const existing = await repo.findOneBy({
        professionalId: target.professionalId,
        dayOfWeek,
        startTime: LEGACY_START,
        endTime: LEGACY_END,
        validFrom: LEGACY_SCHEDULE_FROM,
      })

      if (existing) {
        ids.set(scheduleKey(target.professionalId, dayOfWeek), existing.id)
        continue
      }

      const id = randomUUID()
      ids.set(scheduleKey(target.professionalId, dayOfWeek), id)
      if (dryRun) continue

      await repo.insert({
        id,
        professionalId: target.professionalId,
        clinicId: target.clinicId,
        dayOfWeek,
        startTime: LEGACY_START,
        endTime: LEGACY_END,
        slotDurationInMinutes: LEGACY_SLOT_MINUTES,
        validFrom: LEGACY_SCHEDULE_FROM,
        validUntil,
      })
    }
  }

  return ids
}

function scheduleKey(professionalId: string, dayOfWeek: DayOfWeek): string {
  return `${professionalId}::${dayOfWeek}`
}

// ---------------------------------------------------------------- pacientes

/** Cada paciente pertence às clínicas em que foi atendido — às vezes às duas. */
function resolveOwnerByPatient(
  schedulings: IClinicSchedulingRow[],
  records: IClinicRecordRow[],
): Map<string, Set<'main' | 'orthopedics'>> {
  const owners = new Map<string, Set<'main' | 'orthopedics'>>()

  const add = (patientId: string, owner: 'main' | 'orthopedics') => {
    if (!patientId) return
    const set = owners.get(patientId) ?? new Set()
    set.add(owner)
    owners.set(patientId, set)
  }

  for (const row of schedulings) add(row.patient_id, resolveOwner(row.procedures))
  for (const row of records) add(row.patient_id, resolveOwner(row.procedures))

  return owners
}

async function importPatients(
  queryRunner: QueryRunner,
  context: ImportContext,
  rows: ReturnType<typeof readPatients>,
  ownerByPatient: Map<string, Set<'main' | 'orthopedics'>>,
  report: ImportReport,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const patientRepo = queryRunner.manager.getRepository(Patient)
  const userRepo = queryRunner.manager.getRepository(User)
  const ids = new Map<string, string>()

  const mapped = dedupeEmails(rows.map(mapPatient))
  const byDocument = new Map<string, MappedPatient>()

  for (const patient of mapped) {
    report.patients.read += 1

    if (!patient.documentNumber) {
      report.attention.patientsWithoutDocument.push(`${patient.fullName} (${patient.birthDate})`)
    } else {
      const twin = byDocument.get(patient.documentNumber)
      if (twin) {
        // Mesmo CPF: o índice único não admite os dois. O primeiro (mais antigo)
        // vence e o segundo passa a apontar para ele, para as consultas do
        // cadastro perdedor caírem no cadastro que ficou.
        report.attention.mergedDuplicates.push(
          `${patient.fullName} ↔ ${twin.fullName} (CPF ${patient.documentNumber})`,
        )
        report.patients.skipped += 1
        for (const owner of ownerByPatient.get(patient.externalId) ?? new Set(['main' as const])) {
          const key = patientKey(owner, patient.externalId)
          const twinKey = patientKey(owner, twin.externalId)
          const twinId = ids.get(twinKey)
          if (twinId) ids.set(key, twinId)
        }
        continue
      }
      byDocument.set(patient.documentNumber, patient)
    }

    if (patient.emailIsPlaceholder) {
      report.attention.synthesizedEmails.push(`${patient.fullName} → ${patient.email}`)
    }
    if (patient.addressIsPartial) {
      report.attention.partialAddresses.push(patient.fullName)
    }

    const owners = ownerByPatient.get(patient.externalId) ?? new Set<'main' | 'orthopedics'>(['main'])
    for (const owner of owners) {
      const target = owner === 'orthopedics' ? context.orthopedics : context.main
      const id = await upsertPatient(
        patientRepo,
        userRepo,
        target,
        patient,
        report,
        dryRun,
      )
      ids.set(patientKey(owner, patient.externalId), id)
    }
  }

  return ids
}

function patientKey(owner: 'main' | 'orthopedics', externalId: string): string {
  return `${owner}::${externalId}`
}

async function upsertPatient(
  patientRepo: ReturnType<QueryRunner['manager']['getRepository']>,
  userRepo: ReturnType<QueryRunner['manager']['getRepository']>,
  target: ClinicTarget,
  patient: MappedPatient,
  report: ImportReport,
  dryRun: boolean,
): Promise<string> {
  const repo = patientRepo as unknown as import('typeorm').Repository<Patient>
  const users = userRepo as unknown as import('typeorm').Repository<User>

  // 1. já importado antes
  const byExternal = await repo.findOneBy({
    clinicId: target.clinicId,
    externalSource: EXTERNAL_SOURCE,
    externalId: patient.externalId,
  })
  if (byExternal) {
    report.patients.matched += 1
    return byExternal.id
  }

  // 2. já existe pelo CPF
  let existing = patient.documentNumber
    ? await repo.findOneBy({ clinicId: target.clinicId, documentNumber: patient.documentNumber })
    : null

  // 3. sem CPF (ou CPF não achou): nome + nascimento. Foi assim que a
  //    "Maria Aurea Borba" do IClinic se revelou a "Aurea Borba" do Pulso.
  if (!existing) {
    const candidates = await repo
      .createQueryBuilder('patient')
      .innerJoinAndSelect('patient.user', 'user')
      .where('patient.clinic_id = :clinicId', { clinicId: target.clinicId })
      .andWhere('patient.birth_date = :birthDate', { birthDate: patient.birthDate })
      .getMany()

    existing =
      candidates.find((candidate) => normalizeName(candidate.user.fullName) === normalizeName(patient.fullName)) ??
      null
  }

  if (existing) {
    report.patients.matched += 1
    report.attention.matchedExistingPatients.push(
      `${patient.fullName} (${target.clinicSlug}) — já cadastrado, apenas vinculado à origem`,
    )
    if (!dryRun) {
      await repo.update(existing.id, {
        externalSource: EXTERNAL_SOURCE,
        externalId: patient.externalId,
      })
    }
    return existing.id
  }

  const patientId = randomUUID()
  report.patients.created += 1
  if (dryRun) return patientId

  const userId = randomUUID()
  await users.insert({
    id: userId,
    fullName: patient.fullName,
    email: patient.email,
    password: await bcrypt.hash(randomUUID(), 10),
    role: UserRole.PATIENT,
    isActive: false,
    clinicId: target.clinicId,
  })

  await repo.insert({
    id: patientId,
    userId,
    clinicId: target.clinicId,
    documentNumber: patient.documentNumber,
    phoneNumber: patient.phoneNumber,
    birthDate: patient.birthDate,
    gender: patient.gender,
    responsiblePatientId: null,
    kinshipType: null,
    addressStreet: patient.address?.street ?? null,
    addressNumber: patient.address?.number ?? null,
    addressComplement: patient.address?.complement ?? null,
    addressNeighborhood: patient.address?.neighborhood ?? null,
    addressCity: patient.address?.city ?? null,
    addressState: patient.address?.state ?? null,
    addressZipCode: patient.address?.zipCode ?? null,
    addressCountry: patient.address?.country ?? null,
    externalSource: EXTERNAL_SOURCE,
    externalId: patient.externalId,
  })

  return patientId
}

// ---------------------------------------------------- bloqueios de agenda

async function importScheduleExceptions(
  queryRunner: QueryRunner,
  context: ImportContext,
  schedulings: IClinicSchedulingRow[],
  report: ImportReport,
  dryRun: boolean,
): Promise<void> {
  const repo = queryRunner.manager.getRepository(ScheduleException)
  const blocks = schedulings.filter((row) => !row.patient_id && isBlockingEvent(row))

  for (const row of blocks) {
    report.scheduleExceptions.read += 1
    const target = context.main

    const existing = await repo.findOneBy({
      clinicId: target.clinicId,
      professionalId: target.professionalId,
      date: row.date,
    })
    if (existing) {
      report.scheduleExceptions.matched += 1
      continue
    }

    report.scheduleExceptions.created += 1
    if (dryRun) continue

    // Bloqueio de dia inteiro entra com start/end nulos, que é como o Pulso
    // representa "o dia todo" (ver isSlotBlockedByExceptions).
    const isAllDay = row.all_day === 'Sim'
    await repo.insert({
      id: randomUUID(),
      clinicId: target.clinicId,
      professionalId: target.professionalId,
      date: row.date,
      startTime: isAllDay ? null : toShortTime(row.start_time),
      endTime: isAllDay ? null : toShortTime(row.end_time),
      reason: (row.description || 'Bloqueio importado do IClinic').slice(0, 500),
    })
  }
}

// ---------------------------------------------------------------- consultas

/** Prontuário casa com a consulta por (paciente, data) — 1.282/1.282 no acervo. */
function recordKeyByPatientAndDate(row: { patient_id: string; date: string }): string {
  return `${row.patient_id}::${row.date}`
}

async function importAppointments(
  queryRunner: QueryRunner,
  context: ImportContext,
  schedulings: IClinicSchedulingRow[],
  records: IClinicRecordRow[],
  patientIds: Map<string, string>,
  labelIds: Map<string, string>,
  legacyScheduleIds: Map<string, string>,
  report: ImportReport,
  dryRun: boolean,
): Promise<Map<string, string>> {
  const repo = queryRunner.manager.getRepository(Appointment)
  const ids = new Map<string, string>()

  const recordKeys = new Set(records.map(recordKeyByPatientAndDate))
  const today = new Date().toISOString().slice(0, 10)

  // O índice UQ_appointment_slot_active proíbe dois `scheduled`/`confirmed` no
  // mesmo horário do mesmo profissional — e o IClinic permitia. Duas marcações
  // duplas do acervo cairiam aqui e abortariam a transação inteira.
  const occupiedSlots = new Set<string>()

  // Grade real de cada profissional, para decidir se uma consulta futura cabe.
  const realSlots = await loadRealSlots(queryRunner, context)

  for (const row of schedulings) {
    report.appointments.read += 1

    if (!row.patient_id) {
      // Bloqueios já viraram exceção de agenda; o resto não tem paciente e
      // `appointments.patient_id` é NOT NULL.
      if (!isBlockingEvent(row)) {
        report.attention.discardedEvents.push(
          `${row.date} ${toShortTime(row.start_time)} — evento sem paciente ("${row.description || 'sem descrição'}")`,
        )
      }
      report.appointments.skipped += 1
      continue
    }

    const owner = resolveOwner(row.procedures)
    const target = owner === 'orthopedics' ? context.orthopedics : context.main
    const patientId = patientIds.get(patientKey(owner, row.patient_id))
    if (!patientId) {
      report.attention.discardedEvents.push(
        `${row.date} ${toShortTime(row.start_time)} — paciente ${row.patient_id} não importado`,
      )
      report.appointments.skipped += 1
      continue
    }

    const existing = await repo.findOneBy({
      clinicId: target.clinicId,
      externalSource: EXTERNAL_SOURCE,
      externalId: row.pk,
    })
    if (existing) {
      ids.set(row.pk, existing.id)
      report.appointments.matched += 1
      continue
    }

    const startTime = toShortTime(row.start_time)
    const isFuture = row.date > today
    const { status, cancellationReason } = mapStatus({
      hasMedicalRecord: recordKeys.has(recordKeyByPatientAndDate(row)),
      isFuture,
      iclinicStatus: row.status,
    })

    // Consulta futura precisa cair na grade real — é a agenda que a Dra. vai
    // abrir amanhã. Fora dela, não se inventa horário: vai para o relatório.
    let scheduleId: string | undefined
    let endTime = toShortTime(row.end_time)

    if (isFuture) {
      const slot = realSlots.get(slotKey(target.professionalId, row.date, startTime))
      if (!slot) {
        report.attention.futureAppointmentsOffGrid.push(
          `${formatBrDate(row.date)} ${startTime} — ${row.patient_name || row.patient_id}`,
        )
        report.appointments.skipped += 1
        continue
      }
      scheduleId = slot.scheduleId
      endTime = slot.endTime
    } else {
      scheduleId = legacyScheduleIds.get(scheduleKey(target.professionalId, weekdayOf(row.date)))
    }

    if (!scheduleId) {
      report.attention.discardedEvents.push(
        `${row.date} ${startTime} — sem agenda para ancorar a consulta`,
      )
      report.appointments.skipped += 1
      continue
    }

    // Só status ativo ocupa slot; consulta passada (completed/cancelled/no_show)
    // convive com outra no mesmo horário.
    const occupiesSlot = status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED
    if (occupiesSlot) {
      const slot = `${target.clinicId}::${target.professionalId}::${row.date}::${startTime}`
      const alreadyTakenInDb = await repo
        .createQueryBuilder('appointment')
        .where('appointment.clinic_id = :clinicId', { clinicId: target.clinicId })
        .andWhere('appointment.professional_id = :professionalId', { professionalId: target.professionalId })
        .andWhere('appointment.date = :date', { date: row.date })
        .andWhere('appointment.start_time = :startTime', { startTime })
        .andWhere('appointment.status IN (:...statuses)', {
          statuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        })
        .andWhere('appointment.deleted_at IS NULL')
        .getOne()

      if (occupiedSlots.has(slot) || alreadyTakenInDb) {
        report.attention.slotConflicts.push(
          `${formatBrDate(row.date)} ${startTime} — ${row.patient_name || row.patient_id}`,
        )
        report.appointments.skipped += 1
        continue
      }
      occupiedSlots.add(slot)
    }

    const labelName = resolveLabelName(row.procedures)
    const id = randomUUID()
    ids.set(row.pk, id)
    report.appointments.created += 1
    if (dryRun) continue

    await repo.insert({
      id,
      clinicId: target.clinicId,
      professionalId: target.professionalId,
      patientId,
      specialtyId: target.specialtyId,
      labelId: labelName ? labelIds.get(labelKey(target.clinicId, labelName)) ?? null : null,
      scheduleId,
      date: row.date,
      startTime,
      endTime,
      status,
      insuranceType: AppointmentInsuranceType.PARTICULAR,
      reason: row.description ? row.description.slice(0, 1000) : null,
      cancellationReason,
      externalSource: EXTERNAL_SOURCE,
      externalId: row.pk,
    })
  }

  return ids
}

interface RealSlot {
  scheduleId: string
  endTime: string
}

function slotKey(professionalId: string, date: string, startTime: string): string {
  return `${professionalId}::${weekdayOf(date)}::${startTime}`
}

/**
 * Expande as agendas reais (as que valem daqui para frente) nos horários que
 * elas de fato oferecem, reusando o `generateSlots` do produto — a validação da
 * carga e a da tela não podem divergir.
 *
 * A chave é o dia da semana, não a data: a agenda é semanal, e guardar data a
 * data significaria materializar todo o calendário futuro.
 */
async function loadRealSlots(
  queryRunner: QueryRunner,
  context: ImportContext,
): Promise<Map<string, RealSlot>> {
  const repo = queryRunner.manager.getRepository(Schedule)
  const slots = new Map<string, RealSlot>()
  const today = new Date().toISOString().slice(0, 10)

  for (const target of [context.main, context.orthopedics]) {
    const schedules = await repo
      .createQueryBuilder('schedule')
      .where('schedule.professional_id = :professionalId', { professionalId: target.professionalId })
      .andWhere('schedule.deleted_at IS NULL')
      // A agenda legado morre na véspera do go-live: não serve para o futuro.
      .andWhere('(schedule.valid_until IS NULL OR schedule.valid_until >= :today)', { today })
      .getMany()

    for (const schedule of schedules) {
      for (const slot of generateSlots(schedule)) {
        slots.set(`${target.professionalId}::${schedule.dayOfWeek}::${slot.startTime}`, {
          scheduleId: schedule.id,
          endTime: slot.endTime,
        })
      }
    }
  }

  return slots
}

function weekdayOf(isoDate: string): DayOfWeek {
  // Meio-dia evita que o deslocamento de fuso jogue a data para o dia anterior.
  return WEEKDAYS[new Date(`${isoDate}T12:00:00`).getDay()]
}

function formatBrDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

// -------------------------------------------------------------- prontuários

async function importMedicalRecords(
  queryRunner: QueryRunner,
  context: ImportContext,
  records: IClinicRecordRow[],
  patientIds: Map<string, string>,
  appointmentIds: Map<string, string>,
  templateIds: Map<string, string>,
  report: ImportReport,
  dryRun: boolean,
): Promise<void> {
  const repo = queryRunner.manager.getRepository(MedicalRecord)
  const appointmentRepo = queryRunner.manager.getRepository(Appointment)
  const templateRepo = queryRunner.manager.getRepository(MedicalRecordTemplate)

  // Uma consulta por (paciente, data), que é como o prontuário do IClinic se
  // liga à agenda — o horário diverge em 6 dos 1.282.
  const appointmentByPatientAndDate = new Map<string, { id: string; specialtyId: string | null }>()
  for (const [externalId, appointmentId] of appointmentIds) {
    const appointment = dryRun
      ? undefined
      : await appointmentRepo.findOneBy({ id: appointmentId })
    if (!appointment) continue
    appointmentByPatientAndDate.set(`${appointment.patientId}::${appointment.date}`, {
      id: appointment.id,
      specialtyId: appointment.specialtyId,
    })
    void externalId
  }

  const snapshots = new Map<string, MedicalRecordTemplate>()
  // Atendimentos que já receberam prontuário nesta execução. Existe para a
  // simulação enxergar o mesmo que a carga: sem consultas gravadas, ela não
  // teria como detectar o segundo prontuário do mesmo dia e relataria um número
  // que a carga real não cumpriria.
  const recordedAppointments = new Set<string>()

  for (const row of records) {
    report.medicalRecords.read += 1

    const mapped = mapMedicalRecord(row)
    if (!mapped) {
      report.medicalRecords.skipped += 1
      continue
    }

    const owner = resolveOwner(row.procedures)
    const target = owner === 'orthopedics' ? context.orthopedics : context.main
    const patientId = patientIds.get(patientKey(owner, row.patient_id))
    if (!patientId) {
      report.medicalRecords.skipped += 1
      continue
    }

    // O atendimento a que este prontuário pertence, na forma que a simulação
    // também conhece (a carga real ainda não gravou consulta nenhuma).
    const appointmentSlot = `${patientId}::${row.date}`

    const existing = await repo.findOneBy({
      clinicId: target.clinicId,
      externalSource: EXTERNAL_SOURCE,
      externalId: row.pk,
    })
    if (existing) {
      recordedAppointments.add(appointmentSlot)
      report.medicalRecords.matched += 1
      continue
    }

    const appointment = appointmentByPatientAndDate.get(`${patientId}::${row.date}`)
    if (!appointment && !dryRun) {
      report.attention.discardedEvents.push(
        `prontuário ${row.pk} (${formatBrDate(row.date)}) — sem consulta correspondente`,
      )
      report.medicalRecords.skipped += 1
      continue
    }

    const templateId = templateIds.get(mapped.tab)
    if (!templateId) {
      report.medicalRecords.skipped += 1
      continue
    }

    // Prontuário é 1:1 com a consulta (índice UQ_medical_record_appointment), e
    // três pacientes do acervo têm dois prontuários no mesmo dia para uma só
    // consulta — o IClinic permitia abrir um segundo registro. Inserir os dois
    // violaria o índice e abortaria a carga inteira; descartar o segundo
    // perderia conteúdo clínico. O segundo vira anotação do primeiro.
    const taken = appointment ? await repo.findOneBy({ appointmentId: appointment.id }) : null
    if (taken || recordedAppointments.has(appointmentSlot)) {
      report.medicalRecords.skipped += 1
      report.attention.discardedEvents.push(
        `prontuário ${row.pk} (${formatBrDate(row.date)}) — segundo registro do mesmo atendimento, anexado às anotações`,
      )
      if (!dryRun && taken) {
        const extra = [mapped.notes, renderDataAsNotes(mapped.data)].filter(Boolean).join('\n\n')
        const merged = [taken.notes, `— Segundo registro do IClinic —`, extra].filter(Boolean).join('\n\n')
        await repo.update(taken.id, { notes: merged })
      }
      continue
    }

    recordedAppointments.add(appointmentSlot)
    report.medicalRecords.created += 1
    if (dryRun) continue

    let template = snapshots.get(templateId)
    if (!template) {
      template = (await templateRepo.findOneBy({ id: templateId })) ?? undefined
      if (template) snapshots.set(templateId, template)
    }

    await repo.insert({
      id: randomUUID(),
      clinicId: target.clinicId,
      appointmentId: appointment!.id,
      patientId,
      professionalId: target.professionalId,
      specialtyId: appointment!.specialtyId,
      templateId,
      templateSchemaSnapshot: template?.fields ?? [],
      // `data` é jsonb livre; o QueryDeepPartialEntity do TypeORM não aceita um
      // Record<string, unknown> direto.
      data: mapped.data as never,
      notes: mapped.notes,
      externalSource: EXTERNAL_SOURCE,
      externalId: row.pk,
    })
  }
}

function yesterdayIso(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Conteúdo de um prontuário como texto corrido, para quando ele não tem onde
 * morar como registro próprio (segundo prontuário do mesmo atendimento).
 */
function renderDataAsNotes(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n\n')
}
