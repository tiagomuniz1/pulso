'use client'

import { useQuery } from '@tanstack/react-query'
import { listPrescriptionTemplatesUseCase } from '@app/core'

export function usePrescriptionTemplates(params?: { professionalId?: string }) {
  return useQuery({
    queryKey: ['prescription-templates', params],
    queryFn: () => listPrescriptionTemplatesUseCase(params),
  })
}
