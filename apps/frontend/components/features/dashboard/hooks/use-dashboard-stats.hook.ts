import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsUseCase } from '@app/core'
import type { IDashboardFilters } from '@app/core'

export function useDashboardStats(filters: IDashboardFilters = {}) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => getDashboardStatsUseCase(filters),
  })
}
