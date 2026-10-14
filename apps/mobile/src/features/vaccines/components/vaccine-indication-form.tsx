import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ICreateVaccineIndicationInput, IVaccineModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'

interface IndicationItem {
  vaccineId: string
  doseLabel: string
  instructions: string
}

/**
 * Indicação de vacina: o que o profissional recomenda, para a paciente
 * aplicar num serviço de imunização.
 *
 * A vacina vem **sempre do catálogo**, sem escape para texto livre — ao
 * contrário da receita, que aceita princípio ativo digitado. Nome livre
 * quebraria a ligação com a caderneta e com o calendário.
 */
export function VaccineIndicationForm({
  appointmentId,
  vaccines,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  appointmentId: string
  vaccines: IVaccineModel[]
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: ICreateVaccineIndicationInput) => void
}) {
  const theme = useTheme()
  const [items, setItems] = useState<IndicationItem[]>([
    { vaccineId: '', doseLabel: '', instructions: '' },
  ])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Atualização funcional, e não `items.map(...)` sobre a variável do render:
  // dois campos alterados antes do próximo render — o que o teclado com
  // sugestão de preenchimento faz sozinho — leriam a mesma lista velha, e o
  // segundo apagaria o primeiro.
  function update(index: number, patch: Partial<IndicationItem>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleSubmit() {
    const chosen = items.filter((item) => item.vaccineId)
    if (chosen.length === 0) {
      setError('Escolha ao menos uma vacina.')
      return
    }
    setError(null)

    onSubmit({
      appointmentId,
      items: chosen.map((item) => ({
        vaccineId: item.vaccineId,
        ...(item.doseLabel.trim() ? { doseLabel: item.doseLabel.trim() } : {}),
        ...(item.instructions.trim() ? { instructions: item.instructions.trim() } : {}),
      })),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  return (
    <DocumentSheet
      title="Nova indicação de vacina"
      isOpen={isOpen}
      onClose={onClose}
      testID="indication-form"
      footer={
        <Button
          label="Emitir indicação"
          loading={isSaving}
          onPress={handleSubmit}
          testID="indication-submit"
        />
      }
    >
      {items.map((item, index) => (
        <View
          key={index}
          style={[styles.item, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
          testID={`indication-item-${index}`}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: theme.textMute }]}>VACINA {index + 1}</Text>
            {items.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setItems((current) => current.filter((_, i) => i !== index))}
                testID={`indication-remove-${index}`}
                hitSlop={8}
              >
                <Text style={{ color: theme.danger, fontSize: 13 }}>Remover</Text>
              </Pressable>
            ) : null}
          </View>

          <SelectField
            value={item.vaccineId || null}
            options={vaccines.map((vaccine) => ({ value: vaccine.id, label: vaccine.name }))}
            onChange={(vaccineId) => update(index, { vaccineId })}
            placeholder="Selecione a vacina"
            testID={`indication-vaccine-${index}`}
          />
          {index === 0 && error ? (
            <Text style={{ color: theme.danger, fontSize: 12 }} testID="indication-error">
              {error}
            </Text>
          ) : null}

          <TextField
            label="Dose (opcional)"
            value={item.doseLabel}
            onChange={(doseLabel) => update(index, { doseLabel })}
            placeholder="1ª dose, reforço..."
            testID={`indication-dose-${index}`}
          />
          <TextField
            label="Orientações (opcional)"
            value={item.instructions}
            onChange={(instructions) => update(index, { instructions })}
            multiline
            testID={`indication-instructions-${index}`}
          />
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          setItems((current) => [...current, { vaccineId: '', doseLabel: '', instructions: '' }])
        }
        testID="indication-add"
        hitSlop={8}
      >
        <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
          + Adicionar vacina
        </Text>
      </Pressable>

      <TextField
        label="Observações (opcional)"
        value={notes}
        onChange={setNotes}
        multiline
        testID="indication-notes"
      />
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  item: { borderWidth: 1, padding: 16, gap: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 10, letterSpacing: 0.5 },
})
