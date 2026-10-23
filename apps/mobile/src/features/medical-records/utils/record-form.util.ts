import { MedicalRecordFieldType } from '@app/shared'
import { coerceFieldValue, type IRecordFieldModel } from '@app/core'

/**
 * O estado do formulário de prontuário.
 *
 * Tudo em string (ou lista de strings, no multiselect) enquanto o profissional
 * digita: é o que os controles do React Native entregam. A conversão para o
 * tipo do campo acontece só na saída, em `toRecordData`, com o mesmo
 * `coerceFieldValue` que a web usa — a divergência aqui faria o mesmo
 * prontuário gravar `"3"` num cliente e `3` no outro.
 */
export type RecordFormValues = Record<string, string | string[]>

export function buildInitialValues(
  schema: IRecordFieldModel[],
  saved: Record<string, unknown> | null,
): RecordFormValues {
  const values: RecordFormValues = {}

  for (const field of schema) {
    const stored = saved?.[field.key]

    if (field.type === MedicalRecordFieldType.MULTISELECT) {
      values[field.key] = Array.isArray(stored) ? stored.map(String) : []
      continue
    }
    // `false` é resposta, não ausência — um `?? ''` o apagaria da tela.
    values[field.key] = stored === undefined || stored === null ? '' : String(stored)
  }

  return values
}

/** Campos obrigatórios que ficaram em branco, na ordem em que aparecem. */
export function findMissingRequired(
  schema: IRecordFieldModel[],
  values: RecordFormValues,
): IRecordFieldModel[] {
  return schema.filter((field) => {
    if (!field.required) return false
    const value = values[field.key]
    return Array.isArray(value) ? value.length === 0 : !value
  })
}

/** O que vai no corpo da requisição, já no tipo de cada campo. */
export function toRecordData(
  schema: IRecordFieldModel[],
  values: RecordFormValues,
): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  for (const field of schema) {
    const raw = values[field.key]
    const coerced = coerceFieldValue(field.type, raw)
    // Campo não preenchido não vira string vazia no prontuário: vira ausência.
    if (coerced === '' || coerced === undefined) continue
    data[field.key] = coerced
  }

  return data
}

/** Os campos de uma seção, ou os soltos quando `sectionKey` é nulo. */
export function fieldsOfSection(
  schema: IRecordFieldModel[],
  sectionKey: string | null,
): IRecordFieldModel[] {
  return schema
    .filter((field) => (field.sectionKey ?? null) === sectionKey)
    .sort((a, b) => a.order - b.order)
}
