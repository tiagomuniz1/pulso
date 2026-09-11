'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAppointmentLabelUseCase } from '../use-cases/delete-appointment-label.use-case'

export function useDeleteAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAppointmentLabelUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-labels'] })
      // O rótulo viaja embutido na consulta: renomear ou recolorir precisa
      // repintar a agenda, senão ela mostra o nome e a cor velhos.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
