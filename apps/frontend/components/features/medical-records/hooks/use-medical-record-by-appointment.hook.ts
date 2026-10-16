'use client'

import { useQuery } from '@tanstack/react-query'
import { getMedicalRecordByAppointmentUseCase } from '@app/core'

export function useMedicalRecordByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['medical-records', 'by-appointment', appointmentId],
    queryFn: () => getMedicalRecordByAppointmentUseCase(appointmentId),
    enabled: !!appointmentId,
  })
}
