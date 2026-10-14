'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateProfessionalUseCase } from '@app/core'
import type { IUpdateProfessionalInput } from '@app/core'
import type { IProfessionalModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useUpdateProfessional() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IProfessionalModel, IApiError, { id: string; data: IUpdateProfessionalInput }>({
    mutationFn: ({ id, data }) => updateProfessionalUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
      queryClient.invalidateQueries({ queryKey: ['professionals', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.push(`${basePath}/professionals/${id}`)
    },
  })
}
