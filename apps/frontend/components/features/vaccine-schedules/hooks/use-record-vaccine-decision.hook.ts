import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordVaccineDecisionUseCase } from '@app/core'

export function useRecordVaccineDecision() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordVaccineDecisionUseCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaccine-status'] }),
  })
}
