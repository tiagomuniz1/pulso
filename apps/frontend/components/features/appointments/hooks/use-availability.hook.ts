import { useQuery } from '@tanstack/react-query'
import { getAvailabilityUseCase } from '@app/core'
import type { IAvailabilityParams } from '@app/core'

export function useAvailability(params: (IAvailabilityParams & { professionalIdKey: string }) | null) {
  return useQuery({
    queryKey: ['availability', params?.professionalIdKey ?? 'self', params?.date ?? ''],
    queryFn: () => getAvailabilityUseCase(params!),
    enabled: params !== null,
  })
}
