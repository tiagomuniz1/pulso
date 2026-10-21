import { DayOfWeek, describeSlotMismatch, timeToMinutes } from '@app/shared'
import { toIsoDate } from '../../lib/date-input'

export interface IScheduleFormValues {
  professionalId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  slotDurationInMinutes: string
  /** Como a pessoa digita: DD/MM/AAAA. Vazio significa sem limite. */
  validFrom: string
  validUntil: string
}

export type ScheduleFormErrors = Partial<Record<string, string>>

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MINIMUM_SLOT = 15
const MAXIMUM_SLOT = 120

/** "0930" → "09:30", recortando o que passa de quatro dígitos. */
export function applyTimeMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/**
 * As regras do cadastro de agenda, as mesmas do zod da web.
 *
 * @param needsProfessional o ADMIN escolhe de quem é a agenda; o
 * PROFESSIONAL cria só a própria e o servidor a deduz do `userId`.
 */
export function validateScheduleForm(
  values: IScheduleFormValues,
  needsProfessional: boolean,
): ScheduleFormErrors {
  const errors: ScheduleFormErrors = {}

  if (needsProfessional && !values.professionalId) {
    errors.professionalId = 'Selecione um profissional'
  }

  if (!(Object.values(DayOfWeek) as string[]).includes(values.dayOfWeek)) {
    errors.dayOfWeek = 'Dia da semana obrigatório'
  }

  if (!TIME.test(values.startTime)) errors.startTime = 'Horário inválido. Use HH:MM'
  if (!TIME.test(values.endTime)) errors.endTime = 'Horário inválido. Use HH:MM'

  // `Number('')` é zero, e zero é inteiro: sem a guarda, o campo vazio
  // viraria "Mínimo 15 minutos", como se alguém tivesse digitado pouco.
  const duration = values.slotDurationInMinutes.trim() === ''
    ? Number.NaN
    : Number(values.slotDurationInMinutes)
  const hasValidDuration =
    Number.isInteger(duration) && duration >= MINIMUM_SLOT && duration <= MAXIMUM_SLOT
  if (!Number.isInteger(duration)) {
    errors.slotDurationInMinutes = 'Duração inválida'
  } else if (duration < MINIMUM_SLOT) {
    errors.slotDurationInMinutes = `Mínimo ${MINIMUM_SLOT} minutos`
  } else if (duration > MAXIMUM_SLOT) {
    errors.slotDurationInMinutes = `Máximo ${MAXIMUM_SLOT} minutos`
  }

  if (TIME.test(values.startTime) && TIME.test(values.endTime)) {
    if (timeToMinutes(values.startTime) >= timeToMinutes(values.endTime)) {
      errors.endTime = 'Horário de fim deve ser após o início'
    } else if (hasValidDuration) {
      /**
       * A sobra não é erro de digitação: 40 minutos é uma duração válida,
       * só não fecha numa janela de 9h. A mensagem do `@app/shared` mostra a
       * conta e oferece as duas saídas — mudar a duração ou mudar o fim.
       */
      const mismatch = describeSlotMismatch(values.startTime, values.endTime, duration)
      if (mismatch) errors.slotDurationInMinutes = mismatch
    }
  }

  const from = values.validFrom ? toIsoDate(values.validFrom) : null
  const until = values.validUntil ? toIsoDate(values.validUntil) : null
  if (values.validFrom && !from) errors.validFrom = 'Data inválida. Ex: 15/05/2026'
  if (values.validUntil && !until) errors.validUntil = 'Data inválida. Ex: 15/05/2026'
  if (from && until && from >= until) {
    errors.validUntil = 'Data final deve ser após a data inicial'
  }

  return errors
}
