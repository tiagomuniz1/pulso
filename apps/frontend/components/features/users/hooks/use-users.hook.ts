import { useQuery } from '@tanstack/react-query'
import { listUsersUseCase } from '@app/core'
import type { IUserListParams } from '@app/core'

export function useUsers(params?: IUserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsersUseCase(params),
  })
}
