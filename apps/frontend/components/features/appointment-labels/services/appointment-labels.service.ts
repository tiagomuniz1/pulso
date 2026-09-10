import { apiClient } from '@/lib/api-client'
import type {
  AppointmentLabelResponseDto,
  CreateAppointmentLabelDto,
  PaginatedAppointmentLabelsResponseDto,
  UpdateAppointmentLabelDto,
} from '@app/shared'
import type { IAppointmentLabelListParams } from '../types/appointment-label-model.types'

export const appointmentLabelsService = {
  getAll: (params?: IAppointmentLabelListParams) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive))
    const query = searchParams.toString()
    return apiClient.get<PaginatedAppointmentLabelsResponseDto>(
      `/appointment-labels${query ? `?${query}` : ''}`,
    )
  },
  create: (data: CreateAppointmentLabelDto) =>
    apiClient.post<AppointmentLabelResponseDto>('/appointment-labels', data),
  update: (id: string, data: UpdateAppointmentLabelDto) =>
    apiClient.patch<AppointmentLabelResponseDto>(`/appointment-labels/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/appointment-labels/${id}`),
}
