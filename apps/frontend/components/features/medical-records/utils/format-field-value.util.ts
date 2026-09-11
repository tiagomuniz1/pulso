import { MedicalRecordFieldType } from '@app/shared'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

const VAZIO = '—'

/**
 * O valor de um campo do prontuário como uma pessoa o lê.
 *
 * Existiam duas destas, divergentes e nenhuma exportada: a de
 * `medical-record-view.tsx` não resolvia o rótulo da opção e a de
 * `appointment-history-section.tsx` resolvia — a mesma paciente aparecia com
 * `hipertensao_grau_2` numa tela e "Hipertensão grau 2" na outra. Nenhuma
 * formatava data.
 *
 * Tem uma irmã no backend
 * (`modules/medical-records/utils/format-record-field-value.util.ts`), usada
 * pelo PDF, e as duas têm de concordar: PDF que discorda da tela é o tipo de
 * defeito que ninguém reporta e todos desconfiam. Os testes das duas usam os
 * mesmos casos.
 */
export function formatFieldValue(
  field: Pick<IRecordFieldModel, 'type' | 'options'>,
  value: unknown,
): string {
  if (value === null || value === undefined || value === '') return VAZIO

  switch (field.type) {
    case MedicalRecordFieldType.BOOLEAN:
      return value ? 'Sim' : 'Não'

    case MedicalRecordFieldType.DATE:
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value.split('-').reverse().join('/')
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
  field: Pick<IRecordFieldModel, 'options'>,
  value: unknown,
): string {
  const option = field.options?.find((candidate) => candidate.value === value)
  return option ? option.label : String(value)
}
