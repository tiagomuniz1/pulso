import { useQuery } from '@tanstack/react-query'
import { listExamRequestsUseCase } from '@app/core'

export function useExamRequests(appointmentId: string) {
  return useQuery({
    queryKey: ['exam-requests', appointmentId],
    queryFn: () => listExamRequestsUseCase(appointmentId),
  })
}
