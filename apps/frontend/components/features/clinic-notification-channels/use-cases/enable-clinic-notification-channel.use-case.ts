import type { NotificationChannel } from '@app/shared'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { toClinicNotificationChannelModel } from '../mappers/to-clinic-notification-channel-model.mapper'
import type { IClinicNotificationChannelModel } from '../types/clinic-notification-channel.types'

export async function enableClinicNotificationChannelUseCase(
  clinicId: string,
  channel: NotificationChannel,
): Promise<IClinicNotificationChannelModel> {
  const dto = await clinicNotificationChannelsService.enable(clinicId, channel)
  return toClinicNotificationChannelModel(dto)
}
