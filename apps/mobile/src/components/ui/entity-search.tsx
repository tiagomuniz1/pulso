import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { TextField } from './fields'

export interface IEntitySearchOption {
  id: string
  label: string
  /** Segunda linha — CPF do titular, e-mail do usuário. */
  hint?: string | null
}

/**
 * Busca com sugestões, para escolher um registro que já existe.
 *
 * Dois campos do cadastro de paciente precisam dela — o usuário existente e o
 * titular do dependente — e os dois têm o mesmo desenho na web: digita, a
 * lista aparece, escolhe, o campo mostra o escolhido. Em vez de duas cópias,
 * uma só que recebe de onde buscar.
 *
 * **Busca a partir de dois caracteres**, como a web: com um, a clínica
 * inteira volta e a lista não ajuda ninguém.
 */
export function EntitySearch({
  label,
  placeholder,
  selectedLabel,
  onSearch,
  onSelect,
  onClear,
  error,
  testID,
  queryKey,
  delayInMilliseconds = 300,
}: {
  label: string
  placeholder: string
  /** O que mostrar quando já há escolha. `null` enquanto não há. */
  selectedLabel: string | null
  onSearch: (term: string) => Promise<IEntitySearchOption[]>
  onSelect: (option: IEntitySearchOption) => void
  onClear: () => void
  error?: string | null
  testID: string
  /** Parte fixa da chave de cache — o que distingue uma busca da outra. */
  queryKey: string
  delayInMilliseconds?: number
}) {
  const theme = useTheme()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), delayInMilliseconds)
    return () => clearTimeout(timer)
  }, [term, delayInMilliseconds])

  const { data, isFetching } = useQuery({
    queryKey: [queryKey, debounced],
    queryFn: () => onSearch(debounced),
    enabled: debounced.trim().length >= 2 && selectedLabel === null,
  })

  const options = data ?? []

  if (selectedLabel !== null) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View
          style={[
            styles.selected,
            { borderRadius: theme.radius.md, borderColor: theme.accent, backgroundColor: theme.accentSoft },
          ]}
          testID={`${testID}-selected`}
        >
          <Text style={[styles.selectedText, { color: theme.text }]}>{selectedLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trocar"
            onPress={() => {
              setTerm('')
              setDebounced('')
              onClear()
            }}
            hitSlop={10}
            testID={`${testID}-clear`}
          >
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Trocar</Text>
          </Pressable>
        </View>
        {error ? (
          <Text style={[styles.error, { color: theme.danger }]} testID={`${testID}-error`}>
            {error}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.field}>
      <TextField
        label={label}
        value={term}
        onChange={setTerm}
        placeholder={placeholder}
        testID={testID}
        required
        error={error}
      />
      {isFetching ? (
        <Text style={[styles.hint, { color: theme.textMute }]} testID={`${testID}-searching`}>
          Buscando...
        </Text>
      ) : null}
      {!isFetching && debounced.trim().length >= 2 && options.length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMute }]} testID={`${testID}-empty`}>
          Nenhum resultado para “{debounced.trim()}”.
        </Text>
      ) : null}
      {options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          onPress={() => onSelect(option)}
          testID={`${testID}-option-${option.id}`}
          style={[styles.option, { borderRadius: theme.radius.md, borderColor: theme.line }]}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>{option.label}</Text>
          {option.hint ? (
            <Text style={{ color: theme.textMute, fontSize: 12 }}>{option.hint}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectedText: { flex: 1, fontSize: 14 },
  option: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  hint: { fontSize: 12 },
  error: { fontSize: 12 },
})
