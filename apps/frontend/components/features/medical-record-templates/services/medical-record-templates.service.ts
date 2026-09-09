import { apiClient } from '@/lib/api-client'
import type {
  CouncilType,
  MedicalRecordTemplateResponseDto,
  PaginatedMedicalRecordTemplatesResponseDto,
  CreateMedicalRecordTemplateDto,
  UpdateMedicalRecordTemplateDto,
} from '@app/shared'

export interface ITemplateListParams {
  page?: number
  limit?: number
  specialtyId?: string
  generalist?: boolean
  councilType?: CouncilType
  /** Omitido traz ativos e inativos — é assim que a gestão reativa um modelo. */
  isActive?: boolean
}

export const medicalRecordTemplatesService = {
  getAll: (params?: ITemplateListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.specialtyId) searchParams.set('specialtyId', params.specialtyId)
    if (params?.generalist) searchParams.set('generalist', 'true')
    if (params?.councilType) searchParams.set('councilType', params.councilType)
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
    const query = searchParams.toString()
    return apiClient.get<PaginatedMedicalRecordTemplatesResponseDto>(
      `/medical-record-templates${query ? `?${query}` : ''}`,
    )
  },
  getById: (id: string) =>
    apiClient.get<MedicalRecordTemplateResponseDto>(`/medical-record-templates/${id}`),
  create: (data: CreateMedicalRecordTemplateDto) =>
    apiClient.post<MedicalRecordTemplateResponseDto>('/medical-record-templates', data),
  update: (id: string, data: UpdateMedicalRecordTemplateDto) =>
    apiClient.patch<MedicalRecordTemplateResponseDto>(`/medical-record-templates/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/medical-record-templates/${id}`),
}
