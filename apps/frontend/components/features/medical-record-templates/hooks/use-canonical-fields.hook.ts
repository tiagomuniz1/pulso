'use client'

import { useQuery } from '@tanstack/react-query'
import { listCanonicalFieldsUseCase } from '@app/core'

export function useCanonicalFields() {
  return useQuery({
    queryKey: ['canonical-fields-for-templates'],
    queryFn: listCanonicalFieldsUseCase,
  })
}
