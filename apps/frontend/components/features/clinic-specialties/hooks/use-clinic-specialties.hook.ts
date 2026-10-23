'use client'

import { useQuery } from '@tanstack/react-query'
import { listClinicSpecialtiesUseCase } from '@app/core'
import type { IClinicSpecialtyListParams } from '@app/core'

export function useClinicSpecialties(clinicId: string, params?: IClinicSpecialtyListParams) {
  return useQuery({
    queryKey: ['clinic-specialties', clinicId, params],
    queryFn: () => listClinicSpecialtiesUseCase(clinicId, params),
    enabled: !!clinicId,
  })
}
