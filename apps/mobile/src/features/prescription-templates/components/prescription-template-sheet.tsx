import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { IApiError, IPrescriptionTemplateModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { DocumentSheet } from '../../documents/components/document-sheet'
import {
  MedicationItemsEditor,
  toMedicationPayload,
  type IMedicationItem,
} from '../../medications/components/medication-items-editor'
import { useTheme } from '../../../theme/theme-context'

const NAME_MINIMUM = 3

export function validateTemplate(name: string, items: IMedicationItem[]) {
  const errors: { name?: string; items?: string } = {}
  if (name.trim().length < NAME_MINIMUM) errors.name = `Mínimo ${NAME_MINIMUM} caracteres`
  if (items.length === 0) errors.items = 'Adicione ao menos um medicamento.'
  return errors
}

function initialItems(template: IPrescriptionTemplateModel | null): IMedicationItem[] {
  if (!template) return []
  return template.items.map((item) => ({
    ...(item.medicationId ? { medicationId: item.medicationId } : {}),
    label: item.name,
    dosage: item.dosage ?? '',
    quantity: item.quantity ?? '',
    instructions: item.instructions,
  }))
}

/**
 * Criar e editar modelo de receita, numa folha.
 *
 * **Não é documento emitido**: é rascunho reutilizável, sem paciente, sem
 * consulta e sem assinatura. Por isso não tem data, não tem QR e não pede
 * a consulta — o que ele guarda é a lista de medicamentos que o
 * profissional repete.
 */
export function PrescriptionTemplateSheet({
  template,
  isOpen,
  isPending,
  submitError,
  onClose,
  onSubmit,
}: {
  /** `null` ao criar. */
  template: IPrescriptionTemplateModel | null
  isOpen: boolean
  isPending: boolean
  submitError: IApiError | null
  onClose: () => void
  onSubmit: (input: {
    name: string
    items: ReturnType<typeof toMedicationPayload>
    notes?: string
    isActive: boolean
  }) => void
}) {
  const theme = useTheme()
  const [name, setName] = useState(template?.name ?? '')
  const [items, setItems] = useState<IMedicationItem[]>(() => initialItems(template))
  const [notes, setNotes] = useState(template?.notes ?? '')
  const [isActive, setActive] = useState(template?.isActive ?? true)
  const [errors, setErrors] = useState<{ name?: string; items?: string }>({})

  function handleSubmit() {
    const found = validateTemplate(name, items)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit({
      name: name.trim(),
      items: toMedicationPayload(items),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      isActive,
    })
  }

  return (
    <DocumentSheet
      title={template ? 'Editar modelo' : 'Novo modelo de receita'}
      isOpen={isOpen}
      onClose={onClose}
      testID="prescription-template-sheet"
      footer={
        <Button
          label={template ? 'Salvar alterações' : 'Criar modelo'}
          loading={isPending}
          onPress={handleSubmit}
          testID="prescription-template-submit"
        />
      }
    >
      {submitError ? (
        <Text
          style={[styles.error, { color: theme.danger }]}
          testID="prescription-template-error"
        >
          {submitError.status === 409
            ? 'Já existe um modelo com este nome.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      <TextField
        label="Nome do modelo"
        required
        value={name}
        onChange={setName}
        placeholder="Ex: Suplementação pré-natal"
        error={errors.name}
        testID="prescription-template-name"
      />

      <MedicationItemsEditor
        items={items}
        onChange={setItems}
        error={errors.items}
        testID="prescription-template-items"
      />

      <TextField
        label="Observações gerais"
        value={notes}
        onChange={setNotes}
        multiline
        placeholder="Observações que acompanham o modelo (opcional)..."
        testID="prescription-template-notes"
      />

      {template ? (
        <ChoiceField
          label="Situação"
          required={false}
          testID="prescription-template-active"
          options={[{ value: 'active', label: 'Modelo ativo' }]}
          selected={isActive ? ['active'] : []}
          multiple
          onToggle={() => setActive((current) => !current)}
          helpText="Modelo inativo some da receita, mas continua guardado."
        />
      ) : null}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
})
