import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeAppointmentUseCase } from '@app/core'
import type { IAppointmentModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCompleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, string>({
    mutationFn: completeAppointmentUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
