import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useTheme } from '../../theme/theme-context'

export interface ISelectOption {
  value: string
  label: string
}

/**
 * O equivalente do `<select>` da web.
 *
 * Caixa de largura total com o valor e uma seta; ao toque, a lista sobe da
 * base. É o que o `<select>` faz no navegador do celular — e, ao contrário do
 * `Picker` nativo, é um caminho de código só para os dois sistemas, sem um
 * ramo por plataforma que o runner de testes nunca exercita.
 *
 * Pastilhas foram a primeira tentativa e estavam erradas: a lista de
 * profissionais de uma clínica tem dezenas de entradas, e numa faixa rolável
 * quem está fora da tela desaparece.
 */
export function SelectField({
  value,
  options,
  onChange,
  placeholder,
  testID,
}: {
  value: string | null
  options: ISelectOption[]
  onChange: (value: string) => void
  placeholder: string
  testID: string
}) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        onPress={() => setOpen(true)}
        testID={testID}
        style={[
          styles.field,
          { borderRadius: theme.radius.md, borderColor: theme.line, backgroundColor: theme.surface2 },
        ]}
      >
        <Text
          style={[styles.value, { color: selected ? theme.text : theme.textMute }]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={[styles.chevron, { color: theme.textDim }]}>⌄</Text>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Fechar lista"
          testID={`${testID}-backdrop`}
        />
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.line }]}
          edges={['bottom']}
        >
          <Text style={[styles.sheetTitle, { color: theme.textMute }]}>{placeholder}</Text>
          <ScrollView testID={`${testID}-options`}>
            {options.map((option) => {
              const isOn = option.value === value
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isOn }}
                  onPress={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  testID={`${testID}-option-${option.value || 'all'}`}
                  style={[styles.option, { borderColor: theme.line }]}
                >
                  <Text style={{ color: isOn ? theme.accent : theme.text, fontSize: 15 }}>
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  value: { flex: 1, fontSize: 14 },
  chevron: { fontSize: 16, lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '60%', borderTopWidth: 1 },
  sheetTitle: { fontSize: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  option: { paddingHorizontal: 20, paddingVertical: 14, minHeight: 48, borderTopWidth: 1 },
})
