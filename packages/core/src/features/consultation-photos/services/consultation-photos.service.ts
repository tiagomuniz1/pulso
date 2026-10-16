import { apiClient } from '../../../api/api-client.registry'
import type { ConsultationPhotoResponseDto, PaginatedConsultationPhotosResponseDto } from '@app/shared'

/**
 * O que vai no `FormData` de um upload.
 *
 * Na web é um `File` do navegador; no celular, o `{ uri, name, type }` que o
 * `FormData` do React Native entende. Os dois são valores válidos de
 * `FormData.append` e nenhum existe no outro ambiente — por isso o tipo é a
 * união, e não `File`, que deixava o app de fora.
 */
export type UploadFile = File | { uri: string; name: string; type: string }

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
