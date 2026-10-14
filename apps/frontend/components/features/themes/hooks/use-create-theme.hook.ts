import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { createThemeUseCase } from '@app/core'

export function useCreateTheme() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation({
    mutationFn: createThemeUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      router.push(`${basePath}/themes`)
    },
  })
}
