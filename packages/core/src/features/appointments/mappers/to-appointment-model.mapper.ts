import type { AppointmentResponseDto } from '@app/shared'
import type { IAppointmentModel } from '../types/appointment-model.types'

export function toAppointmentModel(dto: AppointmentResponseDto): IAppointmentModel {
  return {
    id: dto.id,
    professionalId: dto.professionalId,
    professionalName: dto.professionalName,
    patientId: dto.patientId,
    patientName: dto.patientName,
    specialtyId: dto.specialtyId,
    specialtyName: dto.specialtyName,
    scheduleId: dto.scheduleId,
    date: dto.date,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    reason: dto.reason,
    cancellationReason: dto.cancellationReason,
    seriesId: dto.seriesId,
    seriesSequence: dto.seriesSequence,
    seriesTotalOccurrences: dto.seriesTotalOccurrences,
    // Model E mapper, sempre os dois: `insuranceType` está no DTO, não está no
    // model e não é copiado aqui — some sem erro e sem teste falhando.
    label: dto.label ? { id: dto.label.id, name: dto.label.name, color: dto.label.color } : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
