import { useQuery } from '@tanstack/react-query'
import { listAppointmentPhotosUseCase } from '@app/core'

export function useAppointmentPhotos(appointmentId: string) {
  return useQuery({
    queryKey: ['appointment-photos', appointmentId],
    queryFn: () => listAppointmentPhotosUseCase(appointmentId),
  })
}
