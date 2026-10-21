import { VaccineScheduleStatus } from '@app/shared'
import type { IPatientVaccineStatusItem } from '@app/core'

/**
 * A linguagem é de **sugestão, não de ordem**: o sistema informa o que o
 * calendário diz, e quem decide é quem atende. "Pendente pelo calendário",
 * nunca "em atraso".
 */
export const VACCINE_STATUS_LABELS: Record<VaccineScheduleStatus, string> = {
  [VaccineScheduleStatus.EM_DIA]: 'Em dia',
  [VaccineScheduleStatus.PENDENTE]: 'Pendente pelo calendário',
  [VaccineScheduleStatus.ATRASADA]: 'Fora da janela do calendário',
  [VaccineScheduleStatus.FUTURA]: 'Ainda não devida',
  [VaccineScheduleStatus.NAO_SE_APLICA]: 'Não se aplica',
}

export const VACCINE_STATUS_TONES: Record<
  VaccineScheduleStatus,
  'neutral' | 'good' | 'danger' | 'accent'
> = {
  [VaccineScheduleStatus.EM_DIA]: 'good',
  [VaccineScheduleStatus.PENDENTE]: 'accent',
  [VaccineScheduleStatus.ATRASADA]: 'danger',
  [VaccineScheduleStatus.FUTURA]: 'neutral',
  [VaccineScheduleStatus.NAO_SE_APLICA]: 'neutral',
}

/** A ordem da lista responde "o que preciso olhar agora". */
const ORDER: VaccineScheduleStatus[] = [
  VaccineScheduleStatus.ATRASADA,
  VaccineScheduleStatus.PENDENTE,
  VaccineScheduleStatus.FUTURA,
  VaccineScheduleStatus.EM_DIA,
  VaccineScheduleStatus.NAO_SE_APLICA,
]

export function sortByUrgency(
  items: IPatientVaccineStatusItem[],
): IPatientVaccineStatusItem[] {
  return [...items].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
}

export function countPending(items: IPatientVaccineStatusItem[]): number {
  return items.filter(
    (item) =>
      item.status === VaccineScheduleStatus.PENDENTE ||
      item.status === VaccineScheduleStatus.ATRASADA,
  ).length
}

/**
 * "18 meses" até dois anos; daí em diante, anos — como a mãe responde.
 *
 * Não existe "1 ano": o corte é aos 24 meses, então o primeiro ano
 * inteiro é dito em meses e o menor número de anos possível é dois. A web
 * carrega um ramo para o singular que nada alcança.
 */
export function readableAge(months: number): string {
  if (months < 24) return months === 1 ? '1 mês' : `${months} meses`
  return `${Math.floor(months / 12)} anos`
}

export function pendingSummary(months: number, pending: number): string {
  const age = readableAge(months)
  if (pending === 0) return `${age} · nada pendente pelo calendário`
  if (pending === 1) return `${age} · 1 vacina pendente pelo calendário`
  return `${age} · ${pending} vacinas pendentes pelo calendário`
}

/** "2026-04-12" → "12/04/2026", sem passar por `Date` e sem fuso no meio. */
export function formatIsoDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

/** A linha de apoio: doses tomadas, próxima dose e desde quando. */
export function doseSummary(item: IPatientVaccineStatusItem): string {
  const base = `${item.dosesTaken} de ${item.dosesExpected} dose(s)`
  const next = item.nextDoseLabel ? ` · próxima: ${item.nextDoseLabel}` : ''
  const from = item.nextDoseDueFrom ? ` a partir de ${formatIsoDate(item.nextDoseDueFrom)}` : ''
  return `${base}${next}${from}`
}
