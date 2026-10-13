import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookAppointmentUseCase } from '@app/core'
import type { IBookAppointmentInput } from '@app/core'
import type { IAppointmentModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useBookAppointment() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, IBookAppointmentInput>({
    mutationFn: bookAppointmentUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
