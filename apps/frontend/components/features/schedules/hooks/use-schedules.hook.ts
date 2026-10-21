import { useQuery } from '@tanstack/react-query'
import { listSchedulesUseCase } from '@app/core'
import type { IScheduleListParams } from '@app/core'

export function useSchedules(params?: IScheduleListParams) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => listSchedulesUseCase(params),
  })
}
