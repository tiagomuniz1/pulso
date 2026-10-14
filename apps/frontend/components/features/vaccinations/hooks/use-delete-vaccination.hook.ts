import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccinationUseCase } from '@app/core'

export function useDeleteVaccination() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVaccinationUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccinations'] }),
  })
}
