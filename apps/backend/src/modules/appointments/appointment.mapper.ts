import { AppointmentResponseDto } from '@app/shared'
import { toAppointmentLabelSummary } from '../appointment-labels/appointment-label.mapper'
import { Appointment } from './entities/appointment.entity'

/** O que a entidade sozinha não sabe: os nomes, resolvidos em lote. */
export interface AppointmentResponseContext {
  professionalName: string
  patientName: string
  specialtyName: string | null
  seriesTotalOccurrences: number | null
}

/**
 * Fatorado porque esta conversão estava copiada em nove use-cases.
 *
 * Com nove cópias, um campo novo precisa ser lembrado nove vezes — e esquecer
 * numa só tem consequência visível: se o `PATCH /confirm` devolvesse sem
 * `label`, a cor do rótulo sumiria da agenda no instante em que a consulta
 * fosse confirmada, e voltaria no próximo refetch.
 */
export function toAppointmentResponse(
  appointment: Appointment,
  context: AppointmentResponseContext,
): AppointmentResponseDto {
  return {
    id: appointment.id,
    professionalId: appointment.professionalId,
    professionalName: context.professionalName,
    patientId: appointment.patientId,
    patientName: context.patientName,
    specialtyId: appointment.specialtyId,
    specialtyName: context.specialtyName,
    scheduleId: appointment.scheduleId,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    insuranceType: appointment.insuranceType,
    reason: appointment.reason,
    cancellationReason: appointment.cancellationReason,
    seriesId: appointment.seriesId ?? null,
    seriesSequence: appointment.seriesSequence ?? null,
    seriesTotalOccurrences: context.seriesTotalOccurrences,
    // Vem da relação: um rótulo excluído já chega `null` pelo filtro de soft
    // delete que o TypeORM aplica no join.
    label: appointment.label ? toAppointmentLabelSummary(appointment.label) : null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }
}
