import { useQuery } from '@tanstack/react-query'
import { listAtestadosUseCase } from '@app/core'

export function useAtestados(appointmentId: string) {
  return useQuery({
    queryKey: ['atestados', appointmentId],
    queryFn: () => listAtestadosUseCase(appointmentId),
  })
}
