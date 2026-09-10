'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAppointmentLabelUseCase } from '../use-cases/create-appointment-label.use-case'

export function useCreateAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAppointmentLabelUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-labels'] })
      // O rótulo viaja embutido na consulta: renomear ou recolorir precisa
      // repintar a agenda, senão ela mostra o nome e a cor velhos.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
