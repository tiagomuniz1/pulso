import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reassignAppointmentUseCase } from '@app/core'
import type { IAppointmentModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useReassignAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, { id: string; professionalId: string }>({
    mutationFn: ({ id, professionalId }) => reassignAppointmentUseCase(id, professionalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
