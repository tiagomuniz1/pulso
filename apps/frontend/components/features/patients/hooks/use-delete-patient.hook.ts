import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deletePatientUseCase } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: deletePatientUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
