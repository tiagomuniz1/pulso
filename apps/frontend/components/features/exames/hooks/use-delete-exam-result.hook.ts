'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExamResultUseCase } from '@app/core'

export function useDeleteExamResult(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteExamResultUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-requests', appointmentId] })
    },
  })
}
