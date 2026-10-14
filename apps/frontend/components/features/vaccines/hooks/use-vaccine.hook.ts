import { useQuery } from '@tanstack/react-query'
import { getVaccineUseCase } from '@app/core'

export function useVaccine(id: string) {
  return useQuery({
    queryKey: ['vaccines', id],
    queryFn: () => getVaccineUseCase(id),
    enabled: !!id,
  })
}
