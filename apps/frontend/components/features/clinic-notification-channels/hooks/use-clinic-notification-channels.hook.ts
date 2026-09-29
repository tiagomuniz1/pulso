'use client'

import { useQuery } from '@tanstack/react-query'
import { listClinicNotificationChannelsUseCase } from '../use-cases/list-clinic-notification-channels.use-case'

export function useClinicNotificationChannels(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-notification-channels', clinicId],
    queryFn: () => listClinicNotificationChannelsUseCase(clinicId),
    enabled: Boolean(clinicId),
  })
}
