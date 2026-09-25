import type { NotificationChannel } from '@app/shared'

export interface IClinicNotificationChannelModel {
  id: string
  clinicId: string
  channel: NotificationChannel
  enabledAt: Date
}
