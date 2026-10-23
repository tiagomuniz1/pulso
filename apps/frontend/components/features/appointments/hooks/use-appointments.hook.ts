import { useQuery } from '@tanstack/react-query'
import { listAppointmentsUseCase } from '@app/core'
import type { IAppointmentListParams } from '@app/core'

export function useAppointments(params?: IAppointmentListParams) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => listAppointmentsUseCase(params),
  })
}
