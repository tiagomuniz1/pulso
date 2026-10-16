import { useQuery } from '@tanstack/react-query'
import { getPatientUseCase } from '@app/core'
export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => getPatientUseCase(id),
  })
}
