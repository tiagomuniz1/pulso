import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { listMedicationsUseCase, type ICreatePrescriptionInput } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import { DocumentSheet } from './document-sheet'

interface PrescriptionItem {
  /** Do catálogo; ausente quando o princípio ativo foi digitado. */
  medicationId?: string
  label: string
  dosage: string
  quantity: string
  instructions: string
}

/**
 * Receita: catálogo ou texto livre.
 *
 * Os dois modos existem porque a base da ANVISA não tem tudo — manipulado e
 * princípio ativo sem marca ficam de fora, e recusá-los tornaria a receita
 * inútil para metade das prescrições.
 *
 * "Salvar como modelo" não vem: depende de `prescription-templates`, ainda
 * não portado. É aditivo e entra depois sem mexer nisto.
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
  const [mode, setMode] = useState<'catalogo' | 'digitar'>('catalogo')
  const [search, setSearch] = useState('')
  const [typed, setTyped] = useState('')
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: found } = useQuery({
    queryKey: ['medications', 'search', search],
    queryFn: () => listMedicationsUseCase({ search, limit: 10 }),
    enabled: mode === 'catalogo' && search.trim().length > 0,
  })

  function add(item: PrescriptionItem) {
    setItems([...items, item])
    setSearch('')
    setTyped('')
    setError(null)
  }

  function update(index: number, patch: Partial<PrescriptionItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleSubmit() {
    if (items.length === 0) {
      setError('Adicione ao menos um medicamento.')
      return
    }
    setError(null)

    onSubmit({
      appointmentId,
      items: items.map((item) => ({
        ...(item.medicationId
          ? { medicationId: item.medicationId }
          : { activeIngredientName: item.label }),
        ...(item.dosage.trim() ? { dosage: item.dosage.trim() } : {}),
        ...(item.quantity.trim() ? { quantity: item.quantity.trim() } : {}),
        instructions: item.instructions.trim(),
      })),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
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
      <ChoiceField
        label="Como adicionar"
        required
        options={[
          { value: 'catalogo', label: 'Buscar medicamento' },
          { value: 'digitar', label: 'Digitar' },
        ]}
        selected={[mode]}
        onToggle={(value) => setMode(value as 'catalogo' | 'digitar')}
        testID="prescription-mode"
      />

      {mode === 'catalogo' ? (
        <>
          <TextField
            label="Buscar no catálogo"
            value={search}
            onChange={setSearch}
            placeholder="Digite para buscar medicamento..."
            error={items.length === 0 ? error : null}
            testID="prescription-search"
          />
          {(found?.data ?? []).map((medication) => (
            <Pressable
              key={medication.id}
              accessibilityRole="button"
              onPress={() =>
                add({
                  medicationId: medication.id,
                  label: medication.name,
                  dosage: '',
                  quantity: '',
                  instructions: '',
                })
              }
              testID={`prescription-result-${medication.id}`}
              style={[styles.result, { borderColor: theme.line, borderRadius: theme.radius.md }]}
            >
              <Text style={{ color: theme.text, fontSize: 14 }}>{medication.name}</Text>
              {medication.activeIngredient ? (
                <Text style={{ color: theme.textMute, fontSize: 12 }}>
                  {medication.activeIngredient}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <TextField
            label="Princípio ativo ou manipulado"
            value={typed}
            onChange={setTyped}
            placeholder="Ex: Dipirona sódica 500mg"
            error={items.length === 0 ? error : null}
            testID="prescription-typed"
          />
          <Button
            label="Adicionar"
            variant="outline"
            disabled={!typed.trim()}
            onPress={() => add({ label: typed.trim(), dosage: '', quantity: '', instructions: '' })}
            testID="prescription-add-typed"
          />
        </>
      )}

      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.item, { borderRadius: theme.radius.lg, borderColor: theme.accent }]}
          testID={`prescription-item-${index}`}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
              {item.label}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setItems(items.filter((_, i) => i !== index))}
              testID={`prescription-remove-${index}`}
              hitSlop={8}
            >
              <Text style={{ color: theme.danger, fontSize: 13 }}>Remover</Text>
            </Pressable>
          </View>
          <TextField
            label="Dosagem"
            value={item.dosage}
            onChange={(dosage) => update(index, { dosage })}
            placeholder="Ex: 500mg, 20mg/ml"
            testID={`prescription-dosage-${index}`}
          />
          <TextField
            label="Quantidade"
            value={item.quantity}
            onChange={(quantity) => update(index, { quantity })}
            placeholder="Ex: 1 caixa, 30 cps"
            testID={`prescription-quantity-${index}`}
          />
          <TextField
            label="Posologia"
            value={item.instructions}
            onChange={(instructions) => update(index, { instructions })}
            multiline
            placeholder="Posologia..."
            testID={`prescription-instructions-${index}`}
          />
        </View>
      ))}

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
  result: { borderWidth: 1, padding: 12, gap: 2 },
  item: { borderWidth: 1, padding: 16, gap: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600' },
})
