'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { IUpdateAppointmentLabelInput } from '../types/appointment-label-input.types'
import { updateAppointmentLabelUseCase } from '../use-cases/update-appointment-label.use-case'

export function useUpdateAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateAppointmentLabelInput }) =>
      updateAppointmentLabelUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-labels'] })
      // O rótulo viaja embutido na consulta: renomear ou recolorir precisa
      // repintar a agenda, senão ela mostra o nome e a cor velhos.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
