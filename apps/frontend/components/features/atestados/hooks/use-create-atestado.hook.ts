'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAtestadoUseCase } from '@app/core'

export function useCreateAtestado() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAtestadoUseCase,
    onSuccess: (atestado) => {
      queryClient.invalidateQueries({ queryKey: ['atestados', atestado.appointmentId] })
    },
  })
}
