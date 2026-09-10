'use client'

import { useQuery } from '@tanstack/react-query'
import { listAppointmentLabelsUseCase } from '../use-cases/list-appointment-labels.use-case'
import type { IAppointmentLabelListParams } from '../types/appointment-label-model.types'

export function useAppointmentLabels(params?: IAppointmentLabelListParams) {
  return useQuery({
    queryKey: ['appointment-labels', params],
    queryFn: () => listAppointmentLabelsUseCase(params),
  })
}
