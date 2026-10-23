'use client'

import { useQuery } from '@tanstack/react-query'
import { listAppointmentLabelsUseCase } from '@app/core'
import type { IAppointmentLabelListParams } from '@app/core'

export function useAppointmentLabels(params?: IAppointmentLabelListParams) {
  return useQuery({
    queryKey: ['appointment-labels', params],
    queryFn: () => listAppointmentLabelsUseCase(params),
  })
}
