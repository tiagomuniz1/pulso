import { useQuery } from '@tanstack/react-query'
import { getPatientVaccineStatusUseCase } from '@app/core'

export function usePatientVaccineStatus(patientId: string) {
  return useQuery({
    queryKey: ['vaccine-status', patientId],
    queryFn: () => getPatientVaccineStatusUseCase(patientId),
    enabled: !!patientId,
  })
}
