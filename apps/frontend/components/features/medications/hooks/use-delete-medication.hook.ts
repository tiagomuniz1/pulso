'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMedicationUseCase } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useDeleteMedication() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id: string) => deleteMedicationUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
    },
  })
}
