'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccineIndicationUseCase } from '@app/core'

export function useDeleteVaccineIndication(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteVaccineIndicationUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccine-indications', appointmentId] })
    },
  })
}
