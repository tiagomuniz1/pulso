import { AppointmentLabelSummaryDto } from './appointment-label-response.dto'
import { AppointmentInsuranceType } from '../enums/appointment-insurance-type.enum'
import { AppointmentStatus } from '../enums/appointment-status.enum'

export class AppointmentResponseDto {
  id: string
  professionalId: string
  professionalName: string
  patientId: string
  patientName: string
  specialtyId: string | null
  specialtyName: string | null
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  insuranceType: AppointmentInsuranceType | null
  reason: string | null
  cancellationReason: string | null
  seriesId: string | null
  seriesSequence: number | null
  seriesTotalOccurrences: number | null
  /**
   * O rótulo que colore a consulta na agenda. Aninhado porque os três campos são
   * sempre correlacionados e sempre tudo-ou-nada — `null` é o caso normal.
   */
  label: AppointmentLabelSummaryDto | null
  createdAt: Date
  updatedAt: Date
}
