import { useQuery } from '@tanstack/react-query'
import { getThemesUseCase } from '@app/core'

export function useThemes(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['themes', page, limit],
    queryFn: () => getThemesUseCase(page, limit),
  })
}
