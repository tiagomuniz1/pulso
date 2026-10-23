import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteScheduleUseCase } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deleteScheduleUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
