import { apiClient } from '@/lib/api-client'
import type {
  MedicalRecordResponseDto,
  PaginatedMedicalRecordsResponseDto,
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@app/shared'

export interface IPatientHistoryParams {
  page?: number
  limit?: number
  /**
   * Recorte por especialidade. `'null'` pede exatamente os prontuários de
   * consulta sem especialidade — omitir significaria "todas", que é outra coisa.
   */
  specialtyId?: string
  /** A consulta atual não entra no próprio histórico. */
  excludeAppointmentId?: string
}

export const medicalRecordsService = {
  getById: (id: string) =>
    apiClient.get<MedicalRecordResponseDto>(`/medical-records/${id}`),

  getByAppointment: (appointmentId: string) =>
    apiClient.get<MedicalRecordResponseDto | null>(`/medical-records/by-appointment/${appointmentId}`),

  listByPatient: (patientId: string, params?: IPatientHistoryParams) => {
    const searchParams = new URLSearchParams()
    searchParams.set('patientId', patientId)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.specialtyId) searchParams.set('specialtyId', params.specialtyId)
    if (params?.excludeAppointmentId) {
      searchParams.set('excludeAppointmentId', params.excludeAppointmentId)
    }
    return apiClient.get<PaginatedMedicalRecordsResponseDto>(
      `/medical-records?${searchParams.toString()}`,
    )
  },

  create: (data: CreateMedicalRecordDto) =>
    apiClient.post<MedicalRecordResponseDto>('/medical-records', data),

  update: (id: string, data: UpdateMedicalRecordDto) =>
    apiClient.patch<MedicalRecordResponseDto>(`/medical-records/${id}`, data),

  downloadPdf: (id: string) => apiClient.getBlob(`/medical-records/${id}/pdf`),
}
