import { useQuery } from '@tanstack/react-query'
import { listProfessionalsUseCase } from '@app/core'
import type { IProfessionalListParams } from '@app/core'

export function useProfessionals(params?: IProfessionalListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['professionals', params],
    queryFn: () => listProfessionalsUseCase(params),
    enabled: options?.enabled ?? true,
  })
}
