import { NotificationChannel } from '../enums/notification-channel.enum'

/**
 * A notification channel enabled for a clinic. The row existing *is* the
 * enablement — there is no `isEnabled` flag, the same way a clinic-specialty
 * link is enabled by existing.
 */
export class ClinicNotificationChannelResponseDto {
  id: string
  clinicId: string
  channel: NotificationChannel
  enabledAt: Date
}
