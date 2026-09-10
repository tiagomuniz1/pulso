import { MedicalRecordFieldType, MedicalRecordTemplateFieldDto } from '@app/shared'
import { formatDateBR } from '../../../common/pdf/format-date.util'

const VAZIO = '—'

/**
 * O valor de um campo do prontuário como uma pessoa o lê.
 *
 * Existe uma irmã desta função no frontend
 * (`components/features/medical-records/utils/format-field-value.util.ts`), e
 * as duas têm de concordar: o PDF que discorda da tela é o tipo de defeito que
 * ninguém reporta e todos desconfiam. Os testes das duas usam os mesmos casos.
 *
 * Três regras, todas por causa de como o valor é guardado:
 *
 * - **SELECT e MULTISELECT guardam o `value`, não o `label`.** Sem resolver, o
 *   documento sairia com `hipertensao_grau_2` onde a pessoa escreveu
 *   "Hipertensão grau 2".
 * - **DATE é ISO `YYYY-MM-DD`**, que ninguém lê em português.
 * - **Campo sem valor vira `—`, não some.** Um prontuário é também o registro
 *   do que não foi preenchido; omitir a linha esconderia isso de quem lê.
 */
export function formatRecordFieldValue(
  field: Pick<MedicalRecordTemplateFieldDto, 'type' | 'options'>,
  value: unknown,
): string {
  if (value === null || value === undefined || value === '') return VAZIO

  switch (field.type) {
    case MedicalRecordFieldType.BOOLEAN:
      return value ? 'Sim' : 'Não'

    case MedicalRecordFieldType.DATE:
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? formatDateBR(value)
        : String(value)

    case MedicalRecordFieldType.MULTISELECT: {
      if (!Array.isArray(value)) return resolveOptionLabel(field, value)
      if (value.length === 0) return VAZIO
      return value.map((item) => resolveOptionLabel(field, item)).join(', ')
    }

    case MedicalRecordFieldType.SELECT:
      return resolveOptionLabel(field, value)

    default:
      return String(value)
  }
}

/** Cai no valor cru quando a opção saiu do modelo — melhor que a linha vazia. */
function resolveOptionLabel(
  field: Pick<MedicalRecordTemplateFieldDto, 'options'>,
  value: unknown,
): string {
  const option = field.options?.find((candidate) => candidate.value === value)
  return option ? option.label : String(value)
}
