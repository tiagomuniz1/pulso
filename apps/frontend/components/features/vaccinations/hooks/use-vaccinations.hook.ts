import { useQuery } from '@tanstack/react-query'
import { listVaccinationsUseCase } from '@app/core'
import type { IVaccinationListParams } from '@app/core'

export function useVaccinations(params: IVaccinationListParams) {
  return useQuery({
    queryKey: ['vaccinations', params],
    queryFn: () => listVaccinationsUseCase(params),
    enabled: !!(params.patientId || params.appointmentId),
  })
}
