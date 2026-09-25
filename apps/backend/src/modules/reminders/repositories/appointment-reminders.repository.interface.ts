import { NotificationChannel } from '@app/shared'
import { AppointmentReminder, ReminderStatus } from '../entities/appointment-reminder.entity'

/**
 * A scheduled/confirmed appointment joined with the data needed to build and
 * deliver a reminder message. Deliberately a flat read projection (not the
 * Appointment entity) so the reminder job stays self-contained in this module.
 */
export interface ReminderCandidate {
  appointmentId: string
  clinicId: string
  clinicName: string
  /**
   * One of the clinic's enabled channels. A clinic with two enabled yields two
   * candidates for the same appointment — the projection fans out, so the
   * caller never has to know which channels a clinic opted into.
   */
  channel: NotificationChannel
  date: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM'
  patientName: string
  patientPhone: string
  professionalName: string
}

export abstract class IAppointmentRemindersRepository {
  /**
   * Upcoming scheduled/confirmed appointments whose date is within
   * [dateFrom, dateTo], fanned out across each clinic's enabled notification
   * channels. Cross-clinic, but no longer cross-platform: a clinic with no
   * channel enabled in the backoffice produces no candidate at all.
   */
  abstract findDueCandidates(dateFrom: string, dateTo: string): Promise<ReminderCandidate[]>

  /**
   * Atomically reserves the (appointment, offset) reminder slot. Inserts a row
   * with the given status; returns the created row, or null when a row already
   * exists (unique conflict) — the send-once guarantee across instances.
   */
  abstract claim(
    appointmentId: string,
    clinicId: string,
    offsetLabel: string,
    channel: NotificationChannel,
    status: ReminderStatus,
  ): Promise<AppointmentReminder | null>

  abstract markSent(id: string, providerMessageId: string | null): Promise<void>

  abstract markFailed(id: string, error: string): Promise<void>

  /**
   * Releases a provisional claim (deletes the row) so the (appointment, offset)
   * can be re-attempted on a later tick. Used when the send was skipped for a
   * transient/config reason (e.g. the SMS origination isn't configured yet) —
   * unlike a permanent skip (invalid phone), which stays recorded.
   */
  abstract release(id: string): Promise<void>
}
