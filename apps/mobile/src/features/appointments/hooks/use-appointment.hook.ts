import { useQuery } from '@tanstack/react-query'
import { getAppointmentUseCase } from '@app/core'

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => getAppointmentUseCase(id),
    enabled: Boolean(id),
  })
}
