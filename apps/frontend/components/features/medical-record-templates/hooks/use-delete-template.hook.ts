'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { deleteTemplateUseCase } from '@app/core'
import { useBasePath } from '@/lib/slug-context'

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation({
    mutationFn: deleteTemplateUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
      router.push(`${basePath}/medical-record-templates`)
    },
  })
}
