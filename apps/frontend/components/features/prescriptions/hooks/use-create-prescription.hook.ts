'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPrescriptionUseCase } from '@app/core'

export function useCreatePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPrescriptionUseCase,
    onSuccess: (prescription) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', prescription.appointmentId] })
    },
  })
}
