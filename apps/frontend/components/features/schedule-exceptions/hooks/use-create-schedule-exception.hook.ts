import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createScheduleExceptionUseCase } from '@app/core'
import type { ICreateScheduleExceptionInput, IScheduleExceptionModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useCreateScheduleException() {
  const queryClient = useQueryClient()

  return useMutation<IScheduleExceptionModel, IApiError, ICreateScheduleExceptionInput>({
    mutationFn: createScheduleExceptionUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}
