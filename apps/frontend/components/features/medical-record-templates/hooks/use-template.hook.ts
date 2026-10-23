'use client'

import { useQuery } from '@tanstack/react-query'
import { getTemplateUseCase } from '@app/core'

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['medical-record-templates', id],
    queryFn: () => getTemplateUseCase(id),
    enabled: !!id,
  })
}
