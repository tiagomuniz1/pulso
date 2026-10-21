import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsUseCase, type IDashboardFilters } from '@app/core'

/**
 * Os números do período.
 *
 * A chave carrega o filtro inteiro: trocar a data é outra pergunta, não a
 * mesma com outro parâmetro, e reaproveitar o cache mostraria o período
 * anterior com as datas novas no topo.
 */
export function useDashboardStats(filters: IDashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', filters.from, filters.to, filters.professionalId],
    queryFn: () => getDashboardStatsUseCase(filters),
  })
}
