import { MedicalRecordFieldType } from '@app/shared'
import type { IRecordFieldModel } from '@app/core'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import type { RecordFormValues } from '../utils/record-form.util'

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' },
]

/**
 * Um campo do modelo, no controle que o tipo pede.
 *
 * O valor circula sempre como string (ou lista de strings): é o que os
 * controles do React Native entregam, e converter a cada tecla faria o campo
 * numérico recusar o ponto decimal enquanto ele ainda está sendo digitado.
 * A conversão acontece uma vez, na gravação.
 */
export function DynamicField({
  field,
  value,
  onChange,
  error,
}: {
  field: IRecordFieldModel
  value: string | string[]
  onChange: (value: RecordFormValues[string]) => void
  error: string | null
}) {
  const testID = `field-${field.key}`
  const common = {
    label: field.label,
    required: field.required,
    helpText: field.helpText,
    error,
    testID,
  }

  switch (field.type) {
    case MedicalRecordFieldType.BOOLEAN:
      return (
        <ChoiceField
          {...common}
          options={BOOLEAN_OPTIONS}
          selected={typeof value === 'string' && value ? [value] : []}
          // Tocar na opção já marcada a desmarca: sem isso, uma marcação
          // acidental num campo opcional não teria como ser desfeita.
          onToggle={(option) => onChange(value === option ? '' : option)}
        />
      )

    case MedicalRecordFieldType.SELECT:
      return (
        <ChoiceField
          {...common}
          options={field.options ?? []}
          selected={typeof value === 'string' && value ? [value] : []}
          onToggle={(option) => onChange(value === option ? '' : option)}
        />
      )

    case MedicalRecordFieldType.MULTISELECT: {
      const selected = Array.isArray(value) ? value : []
      return (
        <ChoiceField
          {...common}
          multiple
          options={field.options ?? []}
          selected={selected}
          onToggle={(option) =>
            onChange(
              selected.includes(option)
                ? selected.filter((item) => item !== option)
                : [...selected, option],
            )
          }
        />
      )
    }

    case MedicalRecordFieldType.NUMBER:
      return (
        <TextField
          {...common}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          keyboardType="numeric"
          placeholder={field.placeholder}
        />
      )

    case MedicalRecordFieldType.TEXTAREA:
      return (
        <TextField
          {...common}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          multiline
          placeholder={field.placeholder}
        />
      )

    // DATE entra aqui de propósito: o seletor nativo de data é fase 3, e um
    // campo de texto com o formato no placeholder é preenchível hoje. Fingir
    // um date picker com máscara seria pior do que pedir a data por extenso.
    default:
      return (
        <TextField
          {...common}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          placeholder={
            field.type === MedicalRecordFieldType.DATE
              ? (field.placeholder ?? 'AAAA-MM-DD')
              : field.placeholder
          }
        />
      )
  }
}
