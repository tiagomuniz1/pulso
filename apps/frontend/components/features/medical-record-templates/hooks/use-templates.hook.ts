'use client'

import { useQuery } from '@tanstack/react-query'
import { listTemplatesUseCase } from '@app/core'
import type { ITemplateListParams } from '@app/core'

export function useTemplates(params?: ITemplateListParams | null) {
  return useQuery({
    queryKey: ['medical-record-templates', params],
    queryFn: () => listTemplatesUseCase(params ?? undefined),
    enabled: params !== null,
  })
}
