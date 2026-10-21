import { useQuery } from '@tanstack/react-query'
import { listScheduleRulesUseCase } from '@app/core'

export function useScheduleRules(vaccineId?: string) {
  return useQuery({
    queryKey: ['vaccine-schedule-rules', vaccineId],
    queryFn: () => listScheduleRulesUseCase(vaccineId),
  })
}
