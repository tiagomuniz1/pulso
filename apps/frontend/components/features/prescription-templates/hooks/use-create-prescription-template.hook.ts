'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPrescriptionTemplateUseCase } from '@app/core'

export function useCreatePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPrescriptionTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}
