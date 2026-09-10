import { ConflictException } from '@nestjs/common'
import {
  DB_UNIQUE_CONSTRAINTS,
  isUniqueConstraintViolation,
} from '../../../common/utils/db-constraint.utils'

/**
 * Traduz a violação do índice único de nome para um 409, ou devolve o erro
 * original intacto.
 *
 * Deixado a cargo do índice em vez de ler antes de escrever: ler teria janela de
 * corrida e daria 500 quando perdesse.
 */
export function toAppointmentLabelNameConflict(error: unknown): unknown {
  if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.APPOINTMENT_LABELS_CLINIC_NAME)) {
    return new ConflictException('A label with this name already exists in this clinic')
  }
  return error
}
