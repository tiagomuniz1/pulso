import { useQuery } from '@tanstack/react-query'
import { getReassignCandidatesUseCase } from '@app/core'

export function useReassignCandidates(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['appointments', id, 'reassign-candidates'],
    queryFn: () => getReassignCandidatesUseCase(id),
    enabled: enabled && !!id,
  })
}
