import type { ClinicNotificationChannelResponseDto } from '@app/shared'
import type { IClinicNotificationChannelModel } from '../types/clinic-notification-channel.types'

export function toClinicNotificationChannelModel(
  dto: ClinicNotificationChannelResponseDto,
): IClinicNotificationChannelModel {
  return {
    id: dto.id,
    clinicId: dto.clinicId,
    channel: dto.channel,
    // The API serializes dates as ISO strings; the model carries a real Date.
    enabledAt: new Date(dto.enabledAt),
  }
}
