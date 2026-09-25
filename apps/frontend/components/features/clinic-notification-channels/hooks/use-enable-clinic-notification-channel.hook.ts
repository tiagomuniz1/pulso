'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NotificationChannel } from '@app/shared'
import { enableClinicNotificationChannelUseCase } from '../use-cases/enable-clinic-notification-channel.use-case'
import type { IClinicNotificationChannelModel } from '../types/clinic-notification-channel.types'
import type { IApiError } from '@/types/api.types'

export function useEnableClinicNotificationChannel(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicNotificationChannelModel, IApiError, NotificationChannel>({
    mutationFn: (channel: NotificationChannel) =>
      enableClinicNotificationChannelUseCase(clinicId, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-notification-channels', clinicId] })
    },
  })
}
