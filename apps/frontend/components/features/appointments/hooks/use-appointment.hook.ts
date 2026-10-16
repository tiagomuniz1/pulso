import { useQuery } from '@tanstack/react-query'
import { getAppointmentUseCase } from '@app/core'

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => getAppointmentUseCase(id),
    enabled: !!id,
  })
}
