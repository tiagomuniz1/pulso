import { useQuery } from '@tanstack/react-query'
import { listPatientsUseCase } from '@app/core'
import type { IPatientListParams } from '@app/core'
export function usePatients(params?: IPatientListParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => listPatientsUseCase(params),
  })
}
