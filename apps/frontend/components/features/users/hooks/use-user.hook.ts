import { useQuery } from '@tanstack/react-query'
import { getUserUseCase } from '@app/core'

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUserUseCase(id),
  })
}
