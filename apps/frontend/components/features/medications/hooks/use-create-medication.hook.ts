'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createMedicationUseCase } from '@app/core'
import type { IMedicationModel } from '@app/core'
import type { ICreateMedicationInput } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCreateMedication() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IMedicationModel, IApiError, ICreateMedicationInput>({
    mutationFn: createMedicationUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      router.push(`${basePath}/medications`)
    },
  })
}
