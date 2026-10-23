import { apiClient } from '../../../api/api-client.registry'
import type { CreateMedicalCertificateDto, MedicalCertificateResponseDto } from '@app/shared'

export const atestadosService = {
  getByAppointment: (appointmentId: string) =>
    apiClient.get<MedicalCertificateResponseDto[]>(`/medical-certificates?appointmentId=${appointmentId}`),

  getById: (id: string) =>
    apiClient.get<MedicalCertificateResponseDto>(`/medical-certificates/${id}`),

  create: (data: CreateMedicalCertificateDto) =>
    apiClient.post<MedicalCertificateResponseDto>('/medical-certificates', data),

  remove: (id: string) =>
    apiClient.delete<void>(`/medical-certificates/${id}`),

  downloadPdf: (id: string) =>
    apiClient.getBlob(`/medical-certificates/${id}/pdf`),
}
