'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createUserUseCase } from '@app/core'
import type { ICreateUserInput } from '@app/core'
import type { IUserModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCreateClinicAdminUser(clinicId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IUserModel, IApiError, Omit<ICreateUserInput, 'clinicId'>>({
    mutationFn: (input) => createUserUseCase({ ...input, clinicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/clinics/${clinicId}`)
    },
  })
}
