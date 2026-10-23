import { RecurringOccurrenceAvailability } from '@app/shared'
import { RECURRENCE_STATUS_BADGE_CLASS } from './recurrence-status'

describe('RECURRENCE_STATUS_BADGE_CLASS', () => {
  it('has a badge class for every availability', () => {
    Object.values(RecurringOccurrenceAvailability).forEach((status) => {
      expect(RECURRENCE_STATUS_BADGE_CLASS[status]).toBeTruthy()
    })
  })

  it('paints only the available status with the positive token', () => {
    expect(RECURRENCE_STATUS_BADGE_CLASS[RecurringOccurrenceAvailability.AVAILABLE]).toContain('good')
    expect(RECURRENCE_STATUS_BADGE_CLASS[RecurringOccurrenceAvailability.ALREADY_BOOKED]).toContain(
      'danger',
    )
  })
})
