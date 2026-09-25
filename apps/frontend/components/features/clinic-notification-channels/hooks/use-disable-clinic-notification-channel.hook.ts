'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NotificationChannel } from '@app/shared'
import { disableClinicNotificationChannelUseCase } from '../use-cases/disable-clinic-notification-channel.use-case'
import type { IApiError } from '@/types/api.types'

export function useDisableClinicNotificationChannel(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, NotificationChannel>({
    mutationFn: (channel: NotificationChannel) =>
      disableClinicNotificationChannelUseCase(clinicId, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-notification-channels', clinicId] })
    },
  })
}
