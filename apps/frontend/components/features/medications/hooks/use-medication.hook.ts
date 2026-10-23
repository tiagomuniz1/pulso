import { useQuery } from '@tanstack/react-query'
import { getMedicationUseCase } from '@app/core'

export function useMedication(id: string) {
  return useQuery({
    queryKey: ['medication', id],
    queryFn: () => getMedicationUseCase(id),
    enabled: !!id,
  })
}
