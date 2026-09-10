'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAppointmentLabelUseCase } from '../use-cases/set-appointment-label.use-case'

export function useSetAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, labelId }: { id: string; labelId: string | null }) =>
      setAppointmentLabelUseCase(id, labelId),
    onSuccess: () => {
      // Só as consultas: o rótulo não muda disponibilidade nem contagem, então
      // invalidar availability ou dashboard aqui seria refetch desperdiçado.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
