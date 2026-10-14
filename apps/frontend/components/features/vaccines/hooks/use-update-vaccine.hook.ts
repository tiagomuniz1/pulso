import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateVaccineUseCase } from '@app/core'
import type { IUpdateVaccineInput } from '@app/core'

export function useUpdateVaccine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IUpdateVaccineInput }) =>
      updateVaccineUseCase(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccines'] }),
  })
}
