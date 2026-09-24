import { AppointmentStatus } from '@app/shared'
import { IClinicSchedulingRow } from './iclinic-csv.parser'

/**
 * Evento de agenda do IClinic → consulta do Pulso.
 *
 * O desfecho **não** sai do código de status do IClinic, que está inconsistente
 * no acervo: há `sc` (agendado) em consultas de 2025 e `at` (em atendimento) de
 * meses atrás. A regra confiável é o prontuário: se a consulta gerou um, ela
 * aconteceu. O código só decide o que o prontuário não resolve.
 */

/** Ortopedia é do Dr. Yago — o IClinic registrava tudo sob a conta da Dra. */
const ORTHOPEDICS_MARKER = 'rtopedia'

export type AppointmentOwner = 'main' | 'orthopedics'

export function resolveOwner(procedures: { name?: string }[]): AppointmentOwner {
  const isOrthopedics = procedures.some((procedure) =>
    (procedure.name ?? '').toLowerCase().includes(ORTHOPEDICS_MARKER),
  )
  return isOrthopedics ? 'orthopedics' : 'main'
}

/** `HH:MM:SS` → `HH:mm`. Os segundos do export são ruído do IClinic. */
export function toShortTime(time: string): string {
  return (time ?? '').slice(0, 5)
}

export function isBlockingEvent(row: IClinicSchedulingRow): boolean {
  return row.event_blocked_scheduling === '1' || row.all_day === 'Sim'
}

export interface StatusInput {
  hasMedicalRecord: boolean
  isFuture: boolean
  iclinicStatus: string
}

/** Códigos do IClinic que significam "a pessoa foi atendida". */
const ATTENDED_CODES = new Set(['cp', 'at', 'pa', 'st'])

export function mapStatus({ hasMedicalRecord, isFuture, iclinicStatus }: StatusInput): {
  status: AppointmentStatus
  cancellationReason: string | null
} {
  const code = (iclinicStatus ?? '').trim().toLowerCase()

  if (hasMedicalRecord) return { status: AppointmentStatus.COMPLETED, cancellationReason: null }
  if (code === 'na') return { status: AppointmentStatus.NO_SHOW, cancellationReason: null }

  if (isFuture) {
    return {
      status: code === 'co' ? AppointmentStatus.CONFIRMED : AppointmentStatus.SCHEDULED,
      cancellationReason: null,
    }
  }

  if (ATTENDED_CODES.has(code)) {
    return { status: AppointmentStatus.COMPLETED, cancellationReason: null }
  }

  // Consulta passada que ninguém fechou. Deixá-la `scheduled` a manteria
  // ocupando o índice de slot ativo anos depois; `cancelled` diz a verdade
  // disponível e libera o horário.
  return {
    status: AppointmentStatus.CANCELLED,
    cancellationReason: `Importado do IClinic sem desfecho registrado (status "${code || 'vazio'}")`,
  }
}

/** Nome do procedimento → rótulo da consulta. Nenhuma consulta do acervo tem
 *  mais de um, então o primeiro é o rótulo. */
export function resolveLabelName(procedures: { name?: string }[]): string | null {
  const name = procedures[0]?.name?.trim()
  return name ? name : null
}
