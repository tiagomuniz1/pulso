'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePrescriptionUseCase } from '@app/core'

export function useDeletePrescription(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletePrescriptionUseCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', appointmentId] })
    },
  })
}
