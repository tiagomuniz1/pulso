import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { toClinicNotificationChannelModel } from '../mappers/to-clinic-notification-channel-model.mapper'
import type { IClinicNotificationChannelModel } from '../types/clinic-notification-channel.types'

export async function listClinicNotificationChannelsUseCase(
  clinicId: string,
): Promise<IClinicNotificationChannelModel[]> {
  const dtos = await clinicNotificationChannelsService.getAll(clinicId)
  return dtos.map(toClinicNotificationChannelModel)
}
