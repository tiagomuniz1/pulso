'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExamRequestUseCase } from '@app/core'

export function useCreateExamRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExamRequestUseCase,
    onSuccess: (examRequest) => {
      queryClient.invalidateQueries({ queryKey: ['exam-requests', examRequest.appointmentId] })
    },
  })
}
