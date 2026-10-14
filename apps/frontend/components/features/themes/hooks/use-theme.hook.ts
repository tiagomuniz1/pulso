import { useQuery } from '@tanstack/react-query'
import { getThemeByIdUseCase } from '@app/core'

export function useTheme(id: string) {
  return useQuery({
    queryKey: ['theme', id],
    queryFn: () => getThemeByIdUseCase(id),
    enabled: !!id,
  })
}
