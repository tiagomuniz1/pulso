import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ICreatePrescriptionInput, IPrescriptionTemplateModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import {
  MedicationItemsEditor,
  toMedicationPayload,
  type IMedicationItem,
} from '../../medications/components/medication-items-editor'
import { usePrescriptionTemplates } from '../../prescription-templates/hooks/use-prescription-templates.hook'
import { DocumentSheet } from './document-sheet'

/** Modelo guardado → itens em edição, prontos para ajustar antes de emitir. */
export function itemsFromTemplate(template: IPrescriptionTemplateModel): IMedicationItem[] {
  return template.items.map((item) => ({
    ...(item.medicationId ? { medicationId: item.medicationId } : {}),
    label: item.name,
    dosage: item.dosage ?? '',
    quantity: item.quantity ?? '',
    instructions: item.instructions,
  }))
}

/**
 * Receita: catálogo ou texto livre, com os modelos do profissional à mão.
 *
 * **Partir de um modelo é o motivo de o modelo existir** — ele é o
 * receituário que a pessoa repete no dia a dia. Carregar não emite nada:
 * traz os itens para edição, porque a dose quase sempre muda de paciente
 * para paciente.
 */
export function PrescriptionForm({
  appointmentId,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  appointmentId: string
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: ICreatePrescriptionInput) => void
}) {
  const theme = useTheme()
  const [items, setItems] = useState<IMedicationItem[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const templates = usePrescriptionTemplates()
  const available = (templates.data ?? []).filter((template) => template.isActive)

  function handleSubmit() {
    if (items.length === 0) {
      setError('Adicione ao menos um medicamento.')
      return
    }
    setError(null)

    onSubmit({
      appointmentId,
      items: toMedicationPayload(items),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  function loadTemplate(template: IPrescriptionTemplateModel) {
    setItems(itemsFromTemplate(template))
    setNotes(template.notes ?? '')
    setError(null)
  }

  return (
    <DocumentSheet
      title="Nova receita"
      isOpen={isOpen}
      onClose={onClose}
      testID="prescription-form"
      footer={
        <Button
          label="Emitir receita"
          loading={isSaving}
          onPress={handleSubmit}
          testID="prescription-submit"
        />
      }
    >
      {available.length > 0 ? (
        <View style={styles.templates} testID="prescription-templates">
          <Text style={[styles.templatesTitle, { color: theme.textMute }]}>Partir de um modelo</Text>
          {available.map((template) => (
            <Pressable
              key={template.id}
              accessibilityRole="button"
              onPress={() => loadTemplate(template)}
              testID={`prescription-template-${template.id}`}
              style={[styles.template, { borderColor: theme.line, borderRadius: theme.radius.md }]}
            >
              <Text style={{ color: theme.text, fontSize: 14 }}>{template.name}</Text>
              <Text style={{ color: theme.textMute, fontSize: 12 }}>
                {template.items.length === 1
                  ? '1 medicamento'
                  : `${template.items.length} medicamentos`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <MedicationItemsEditor
        items={items}
        onChange={setItems}
        error={error}
        testID="prescription-items"
      />

      <TextField
        label="Observações gerais"
        value={notes}
        onChange={setNotes}
        multiline
        placeholder="Observações adicionais (opcional)..."
        testID="prescription-notes"
      />
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  templates: { gap: 8 },
  templatesTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  template: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
})
