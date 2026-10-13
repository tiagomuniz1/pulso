'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { updateTemplateUseCase } from '@app/core'
import { useBasePath } from '@/lib/slug-context'

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateTemplateUseCase>[1]) =>
      updateTemplateUseCase(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
      router.push(`${basePath}/medical-record-templates/${id}`)
    },
  })
}
