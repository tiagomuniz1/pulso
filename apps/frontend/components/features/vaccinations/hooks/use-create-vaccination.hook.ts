import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVaccinationUseCase } from '@app/core'

export function useCreateVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createVaccinationUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] }),
  })
}
