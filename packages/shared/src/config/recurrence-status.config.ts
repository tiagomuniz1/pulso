import { RecurringOccurrenceAvailability } from '../enums/recurring-occurrence-availability.enum'

/**
 * Como cada situação de ocorrência se lê. Fica aqui, e não na web, porque o
 * app mostra a mesma lista de datas na folha de agendamento — duas tabelas
 * divergiriam no primeiro rótulo que alguém reescrevesse.
 */
export const RECURRENCE_STATUS_LABELS: Record<RecurringOccurrenceAvailability, string> = {
  [RecurringOccurrenceAvailability.AVAILABLE]: 'Disponível',
  [RecurringOccurrenceAvailability.ALREADY_BOOKED]: 'Ocupado',
  [RecurringOccurrenceAvailability.OUTSIDE_SCHEDULE]: 'Fora da agenda',
  [RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION]: 'Bloqueado',
  [RecurringOccurrenceAvailability.IN_THE_PAST]: 'No passado',
}
