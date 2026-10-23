import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookRecurringAppointmentsUseCase } from '@app/core'
import type { IBookRecurringAppointmentsInput } from '@app/core'
import type { IRecurringAppointmentsResultModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useBookRecurringAppointments() {
  const queryClient = useQueryClient()

  return useMutation<IRecurringAppointmentsResultModel, IApiError, IBookRecurringAppointmentsInput>({
    mutationFn: bookRecurringAppointmentsUseCase,
    onSuccess: () => {
      // Prefix match: one invalidation covers every affected date.
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
