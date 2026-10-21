import { useQuery } from '@tanstack/react-query'
import { getScheduleUseCase } from '@app/core'

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['schedules', id],
    queryFn: () => getScheduleUseCase(id),
    enabled: !!id,
  })
}
