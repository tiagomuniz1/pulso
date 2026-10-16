'use client'

import { useQuery } from '@tanstack/react-query'
import { listPatientMedicalHistoryUseCase } from '@app/core'
import type { IPatientHistoryParams } from '@app/core'

export function usePatientMedicalHistory(patientId: string, params?: IPatientHistoryParams) {
  return useQuery({
    queryKey: ['medical-records', 'patient', patientId, params],
    queryFn: () => listPatientMedicalHistoryUseCase(patientId, params),
    enabled: !!patientId,
  })
}
