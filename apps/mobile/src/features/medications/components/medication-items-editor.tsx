import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { listMedicationsUseCase } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'

/**
 * Um item de receita em edição.
 *
 * `medicationId` ausente significa princípio ativo digitado: a base da
 * ANVISA não tem tudo — manipulado e genérico sem marca ficam de fora, e
 * recusá-los tornaria a receita inútil para metade das prescrições.
 */
export interface IMedicationItem {
  medicationId?: string
  label: string
  dosage: string
  quantity: string
  instructions: string
}

export function emptyItem(label: string, medicationId?: string): IMedicationItem {
  return { ...(medicationId ? { medicationId } : {}), label, dosage: '', quantity: '', instructions: '' }
}

/**
 * Escolher medicamentos e descrever a posologia de cada um.
 *
 * Mora numa feature própria porque **dois lugares** a usam com o mesmo
 * comportamento: a receita emitida na consulta e o modelo de receita que o
 * profissional guarda para repetir. Duas cópias divergiriam no detalhe que
 * mais importa — o que vai no corpo quando o medicamento não veio do
 * catálogo.
 */
export function MedicationItemsEditor({
  items,
  onChange,
  error,
  testID,
}: {
  items: IMedicationItem[]
  onChange: (next: IMedicationItem[]) => void
  error?: string | null
  testID: string
}) {
  const theme = useTheme()
  const [mode, setMode] = useState<'catalogo' | 'digitar'>('catalogo')
  const [search, setSearch] = useState('')
  const [typed, setTyped] = useState('')

  const { data: found } = useQuery({
    queryKey: ['medications', 'search', search],
    queryFn: () => listMedicationsUseCase({ search, limit: 10 }),
    enabled: mode === 'catalogo' && search.trim().length > 0,
  })

  function add(item: IMedicationItem) {
    onChange([...items, item])
    setSearch('')
    setTyped('')
  }

  function update(index: number, patch: Partial<IMedicationItem>) {
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)))
  }

  return (
    <View style={styles.wrapper} testID={testID}>
      <ChoiceField
        label="Como adicionar"
        required
        options={[
          { value: 'catalogo', label: 'Buscar medicamento' },
          { value: 'digitar', label: 'Digitar' },
        ]}
        selected={[mode]}
        onToggle={(value) => setMode(value as 'catalogo' | 'digitar')}
        testID={`${testID}-mode`}
      />

      {mode === 'catalogo' ? (
        <>
          <TextField
            label="Buscar no catálogo"
            value={search}
            onChange={setSearch}
            placeholder="Digite para buscar medicamento..."
            error={items.length === 0 ? error : null}
            testID={`${testID}-search`}
          />
          {(found?.data ?? []).map((medication) => (
            <Pressable
              key={medication.id}
              accessibilityRole="button"
              onPress={() => add(emptyItem(medication.name, medication.id))}
              testID={`${testID}-result-${medication.id}`}
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
            testID={`${testID}-typed`}
          />
          <Button
            label="Adicionar"
            variant="outline"
            disabled={!typed.trim()}
            onPress={() => add(emptyItem(typed.trim()))}
            testID={`${testID}-add-typed`}
          />
        </>
      )}

      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.item, { borderRadius: theme.radius.lg, borderColor: theme.accent }]}
          testID={`${testID}-item-${index}`}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
              {item.label}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(items.filter((_, position) => position !== index))}
              testID={`${testID}-remove-${index}`}
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
            testID={`${testID}-dosage-${index}`}
          />
          <TextField
            label="Quantidade"
            value={item.quantity}
            onChange={(quantity) => update(index, { quantity })}
            placeholder="Ex: 1 caixa, 30 cps"
            testID={`${testID}-quantity-${index}`}
          />
          <TextField
            label="Posologia"
            value={item.instructions}
            onChange={(instructions) => update(index, { instructions })}
            multiline
            placeholder="Posologia..."
            testID={`${testID}-instructions-${index}`}
          />
        </View>
      ))}
    </View>
  )
}

/** O que vai no corpo da requisição, de receita ou de modelo. */
export function toMedicationPayload(items: IMedicationItem[]) {
  return items.map((item) => ({
    ...(item.medicationId
      ? { medicationId: item.medicationId }
      : { activeIngredientName: item.label }),
    ...(item.dosage.trim() ? { dosage: item.dosage.trim() } : {}),
    ...(item.quantity.trim() ? { quantity: item.quantity.trim() } : {}),
    instructions: item.instructions.trim(),
  }))
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  result: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  item: { borderWidth: 1, padding: 12, gap: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600' },
})
