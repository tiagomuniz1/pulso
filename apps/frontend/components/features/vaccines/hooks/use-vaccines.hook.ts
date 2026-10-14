import { useQuery } from '@tanstack/react-query'
import { listVaccinesUseCase } from '@app/core'
import type { IVaccineListParams } from '@app/core'

export function useVaccines(params?: IVaccineListParams) {
  return useQuery({
    queryKey: ['vaccines', params],
    queryFn: () => listVaccinesUseCase(params),
  })
}
