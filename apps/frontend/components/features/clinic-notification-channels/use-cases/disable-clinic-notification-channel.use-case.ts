import type { NotificationChannel } from '@app/shared'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'

export async function disableClinicNotificationChannelUseCase(
  clinicId: string,
  channel: NotificationChannel,
): Promise<void> {
  return clinicNotificationChannelsService.disable(clinicId, channel)
}
