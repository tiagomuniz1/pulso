import { ConflictException } from '@nestjs/common'
import {
  DB_UNIQUE_CONSTRAINTS,
  isUniqueConstraintViolation,
} from '../../../common/utils/db-constraint.utils'

/**
 * Traduz a violação do índice único de nome para um 409 explicável, ou devolve
 * o erro original intacto.
 *
 * A clínica pode ter vários modelos para a mesma especialidade — o que ela não
 * pode é ter dois com o mesmo nome. Sem modelo padrão, a escolha na consulta é
 * explícita e o nome é o único discriminador na tela: duas linhas "Retorno"
 * seriam indistinguíveis.
 *
 * A mensagem cita a especialidade ou a profissão conforme o escopo, porque é
 * onde o nome colidiu — dizer só "nome já existe" mandaria o ADMIN procurar na
 * clínica inteira.
 *
 * Uso: `throw toTemplateNameConflict(error)`.
 */
export function toTemplateNameConflict(error: unknown): unknown {
  if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.TEMPLATE_CLINIC_SPECIALTY_NAME)) {
    return new ConflictException('A template with this name already exists for this specialty')
  }
  if (isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.TEMPLATE_CLINIC_COUNCIL_TYPE_NAME)) {
    return new ConflictException('A template with this name already exists for this profession')
  }
  return error
}
