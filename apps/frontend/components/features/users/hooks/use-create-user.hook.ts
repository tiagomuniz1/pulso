'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createUserUseCase } from '@app/core'
import type { ICreateUserInput } from '@app/core'
import type { IUserModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCreateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IUserModel, IApiError, ICreateUserInput>({
    mutationFn: createUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/users`)
    },
  })
}
