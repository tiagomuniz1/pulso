import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteVaccineUseCase } from '@app/core'

export function useDeleteVaccine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteVaccineUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
  })
}
