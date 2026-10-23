import type { AppointmentLabelColor } from '@app/shared'

export interface IAppointmentLabelModel {
  id: string
  name: string
  color: AppointmentLabelColor
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedAppointmentLabelsModel {
  data: IAppointmentLabelModel[]
  total: number
  page: number
  limit: number
}

export interface IAppointmentLabelListParams {
  page?: number
  limit?: number
  /** Omitido traz ativos e inativos — é assim que a gestão reativa um. */
  isActive?: boolean
}
