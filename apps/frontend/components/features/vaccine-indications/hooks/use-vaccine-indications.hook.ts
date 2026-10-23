import { useQuery } from '@tanstack/react-query'
import { listVaccineIndicationsUseCase } from '@app/core'

export function useVaccineIndications(appointmentId: string) {
  return useQuery({
    queryKey: ['vaccine-indications', appointmentId],
    queryFn: () => listVaccineIndicationsUseCase(appointmentId),
  })
}
