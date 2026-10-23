import { RecurringOccurrenceAvailability } from '../enums/recurring-occurrence-availability.enum'
import { RECURRENCE_STATUS_LABELS } from './recurrence-status.config'

describe('RECURRENCE_STATUS_LABELS', () => {
  it('nomeia cada disponibilidade em português', () => {
    expect(RECURRENCE_STATUS_LABELS).toEqual({
      available: 'Disponível',
      already_booked: 'Ocupado',
      outside_schedule: 'Fora da agenda',
      blocked_by_exception: 'Bloqueado',
      in_the_past: 'No passado',
    })
  })

  // Uma disponibilidade nova sem rótulo apareceria como `undefined` na lista
  // de datas, que é exatamente onde a pessoa decide o que marcar.
  it('cobre todo o enum', () => {
    Object.values(RecurringOccurrenceAvailability).forEach((status) => {
      expect(RECURRENCE_STATUS_LABELS[status]).toBeTruthy()
    })
  })
})
