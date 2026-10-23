'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMedicationUseCase } from '@app/core'
import type { IMedicationModel } from '@app/core'
import type { IUpdateMedicationInput } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useUpdateMedication() {
  const queryClient = useQueryClient()

  return useMutation<IMedicationModel, IApiError, { id: string; data: IUpdateMedicationInput }>({
    mutationFn: ({ id, data }) => updateMedicationUseCase(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] })
      queryClient.invalidateQueries({ queryKey: ['medication', variables.id] })
    },
  })
}
