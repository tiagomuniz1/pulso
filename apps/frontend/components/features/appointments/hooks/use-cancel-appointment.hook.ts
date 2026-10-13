import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelAppointmentUseCase } from '@app/core'
import type { ICancelAppointmentInput } from '@app/core'
import type { IAppointmentModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, { id: string; data: ICancelAppointmentInput }>({
    mutationFn: ({ id, data }) => cancelAppointmentUseCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
