import { apiClient } from '@/lib/api-client'
import type { ClinicNotificationChannelResponseDto, NotificationChannel } from '@app/shared'

export const clinicNotificationChannelsService = {
  getAll: (clinicId: string) =>
    apiClient.get<ClinicNotificationChannelResponseDto[]>(`/clinics/${clinicId}/notification-channels`),
  enable: (clinicId: string, channel: NotificationChannel) =>
    apiClient.post<ClinicNotificationChannelResponseDto>(
      `/clinics/${clinicId}/notification-channels/${channel}`,
    ),
  disable: (clinicId: string, channel: NotificationChannel) =>
    apiClient.delete<void>(`/clinics/${clinicId}/notification-channels/${channel}`),
}
