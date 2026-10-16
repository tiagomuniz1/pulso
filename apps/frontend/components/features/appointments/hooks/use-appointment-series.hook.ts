import { useQuery } from '@tanstack/react-query'
import { getAppointmentSeriesUseCase } from '@app/core'

export function useAppointmentSeries(seriesId: string | null) {
  return useQuery({
    queryKey: ['appointments', 'series', seriesId],
    queryFn: () => getAppointmentSeriesUseCase(seriesId!),
    enabled: !!seriesId,
  })
}
