import { AppointmentLabelResponseDto, AppointmentLabelSummaryDto } from '@app/shared'
import { AppointmentLabel } from './entities/appointment-label.entity'

export function toAppointmentLabelResponse(label: AppointmentLabel): AppointmentLabelResponseDto {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    isActive: label.isActive,
    createdAt: label.createdAt,
    updatedAt: label.updatedAt,
  }
}

/** A forma embutida na consulta: só o que a agenda usa para pintar e nomear. */
export function toAppointmentLabelSummary(label: AppointmentLabel): AppointmentLabelSummaryDto {
  return { id: label.id, name: label.name, color: label.color }
}
