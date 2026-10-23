import { useQuery } from '@tanstack/react-query'
import { listScheduleExceptionsUseCase } from '@app/core'
import type { IScheduleExceptionListParams } from '@app/core'
export function useScheduleExceptions(params?: IScheduleExceptionListParams) {
  return useQuery({
    queryKey: ['schedule-exceptions', params],
    queryFn: () => listScheduleExceptionsUseCase(params),
    enabled: params?.professionalId !== undefined || params?.from !== undefined,
  })
}
