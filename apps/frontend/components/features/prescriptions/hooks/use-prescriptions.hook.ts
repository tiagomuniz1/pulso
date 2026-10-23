import { useQuery } from '@tanstack/react-query'
import { listPrescriptionsUseCase } from '@app/core'

export function usePrescriptions(appointmentId: string) {
  return useQuery({
    queryKey: ['prescriptions', appointmentId],
    queryFn: () => listPrescriptionsUseCase(appointmentId),
  })
}
