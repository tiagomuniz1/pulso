import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ICreateExamRequestInput } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import { DocumentSheet } from './document-sheet'

interface ExamItem {
  name: string
  observations: string
}

/**
 * Pedido de exames: um ou mais, por nome livre.
 *
 * Sem catálogo, ao contrário da receita — é o que a web faz, e o que o
 * backend aceita. "Hemograma completo" é como o laboratório entende.
 */
export function ExamRequestForm({
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
  onSubmit: (input: ICreateExamRequestInput) => void
}) {
  const theme = useTheme()
  const [items, setItems] = useState<ExamItem[]>([{ name: '', observations: '' }])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function update(index: number, patch: Partial<ExamItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleSubmit() {
    const filled = items.filter((item) => item.name.trim())
    if (filled.length === 0) {
      setError('Informe ao menos um exame.')
      return
    }
    setError(null)

    onSubmit({
      appointmentId,
      items: filled.map((item) => ({
        name: item.name.trim(),
        ...(item.observations.trim() ? { observations: item.observations.trim() } : {}),
      })),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  return (
    <DocumentSheet
      title="Novo pedido de exames"
      isOpen={isOpen}
      onClose={onClose}
      testID="exam-form"
      footer={
        <Button
          label="Solicitar exames"
          loading={isSaving}
          onPress={handleSubmit}
          testID="exam-submit"
        />
      }
    >
      {items.map((item, index) => (
        <View
          key={index}
          style={[styles.item, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
          testID={`exam-item-${index}`}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: theme.textMute }]}>EXAME {index + 1}</Text>
            {items.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setItems(items.filter((_, i) => i !== index))}
                testID={`exam-remove-${index}`}
                hitSlop={8}
              >
                <Text style={{ color: theme.danger, fontSize: 13 }}>Remover</Text>
              </Pressable>
            ) : null}
          </View>
          <TextField
            label="Nome do exame"
            required
            value={item.name}
            onChange={(name) => update(index, { name })}
            placeholder="Ex: Hemograma completo"
            error={index === 0 ? error : null}
            testID={`exam-name-${index}`}
          />
          <TextField
            label="Observação (opcional)"
            value={item.observations}
            onChange={(observations) => update(index, { observations })}
            placeholder="Ex: Jejum de 8 horas"
            testID={`exam-observations-${index}`}
          />
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => setItems([...items, { name: '', observations: '' }])}
        testID="exam-add"
        hitSlop={8}
      >
        <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
          + Adicionar exame
        </Text>
      </Pressable>

      <TextField
        label="Observações gerais"
        value={notes}
        onChange={setNotes}
        multiline
        placeholder="Observações adicionais (opcional)..."
        testID="exam-notes"
      />
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  item: { borderWidth: 1, padding: 16, gap: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 10, letterSpacing: 0.5 },
})
