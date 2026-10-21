'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { linkSpecialtyUseCase } from '@app/core'
import type { IClinicSpecialtyModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useLinkSpecialty(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation<IClinicSpecialtyModel, IApiError, string>({
    mutationFn: (specialtyId: string) => linkSpecialtyUseCase(clinicId, specialtyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-specialties', clinicId] })
    },
  })
}
