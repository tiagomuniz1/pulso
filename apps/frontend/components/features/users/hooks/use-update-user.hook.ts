'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateUserUseCase } from '@app/core'
import type { IUpdateUserInput } from '@app/core'
import type { IUserModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IUserModel, IApiError, { id: string; input: IUpdateUserInput }>({
    mutationFn: ({ id, input }) => updateUserUseCase(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', id] })
      router.push(`${basePath}/users`)
    },
  })
}
