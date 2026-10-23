import { apiClient } from '../../../api/api-client.registry'
import type { ConsultationPhotoResponseDto, PaginatedConsultationPhotosResponseDto } from '@app/shared'
import type { UploadFile } from '../../../types/upload-file.types'

export const consultationPhotosService = {
  getByAppointment: (appointmentId: string) =>
    apiClient.get<ConsultationPhotoResponseDto[]>(`/consultation-photos?appointmentId=${appointmentId}`),

  upload: (appointmentId: string, files: UploadFile[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file as Blob))
    return apiClient.post<ConsultationPhotoResponseDto[]>(
      `/consultation-photos/appointments/${appointmentId}`,
      formData,
    )
  },

  remove: (id: string) => apiClient.delete<void>(`/consultation-photos/${id}`),

  getFileBlob: (id: string) => apiClient.getBlob(`/consultation-photos/${id}/file`),

  getByPatient: (patientId: string, params: { page: number; limit: number }) =>
    apiClient.get<PaginatedConsultationPhotosResponseDto>(
      `/consultation-photos/by-patient/${patientId}?page=${params.page}&limit=${params.limit}`,
    ),
}
