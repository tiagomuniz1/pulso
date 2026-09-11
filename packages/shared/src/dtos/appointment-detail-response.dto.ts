import { AppointmentResponseDto } from './appointment-response.dto'
import { AppointmentPatientDto } from './appointment-patient.dto'

export class AppointmentDetailResponseDto extends AppointmentResponseDto {
  patient: AppointmentPatientDto
  /**
   * Still-cancellable occurrences of the same series dated after this one.
   * Null when the appointment is not part of a series. Drives the "this and all
   * future" cancellation copy — seriesTotalOccurrences minus seriesSequence
   * would be wrong, as it ignores already cancelled/completed occurrences.
   */
  seriesFutureCount: number | null
  /**
   * Primeira vez que esta paciente é atendida por este profissional — ou seja,
   * não há consulta anterior dos dois que não tenha sido cancelada nem faltada.
   *
   * Calculado na leitura, não gravado: reatribuir ou cancelar uma consulta muda
   * quem foi a primeira vez, e uma coluna precisaria ser recalculada em cascata.
   *
   * Vive só no DTO de detalhe. No DTO base obrigaria os dez produtores do
   * `appointment.mapper` a resolvê-lo, e a listagem é cacheada por 30s.
   */
  isFirstVisitWithProfessional: boolean
}
