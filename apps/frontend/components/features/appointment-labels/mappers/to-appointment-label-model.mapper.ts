import type {
  AppointmentLabelResponseDto,
  PaginatedAppointmentLabelsResponseDto,
} from '@app/shared'
import type {
  IAppointmentLabelModel,
  IPaginatedAppointmentLabelsModel,
} from '../types/appointment-label-model.types'

export function toAppointmentLabelModel(
  dto: AppointmentLabelResponseDto,
): IAppointmentLabelModel {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt as unknown as string),
    updatedAt: new Date(dto.updatedAt as unknown as string),
  }
}

export function toPaginatedAppointmentLabelsModel(
  dto: PaginatedAppointmentLabelsResponseDto,
): IPaginatedAppointmentLabelsModel {
  return {
    data: dto.data.map(toAppointmentLabelModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
