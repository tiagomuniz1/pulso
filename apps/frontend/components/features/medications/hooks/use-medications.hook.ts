import { useQuery } from '@tanstack/react-query'
import { listMedicationsUseCase } from '@app/core'
import type { IMedicationListParams } from '@app/core'

export function useMedications(params?: IMedicationListParams) {
  return useQuery({
    queryKey: ['medications', params],
    queryFn: () => listMedicationsUseCase(params),
  })
}
