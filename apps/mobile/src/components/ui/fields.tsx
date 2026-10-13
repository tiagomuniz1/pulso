import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

function Label({ label, required }: { label: string; required: boolean }) {
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  )
}

export function TextField({
  label,
  value,
  onChange,
  testID,
  required = false,
  multiline = false,
  keyboardType = 'default',
  placeholder,
  helpText,
  error,
  secureTextEntry = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  testID: string
  required?: boolean
  multiline?: boolean
  keyboardType?: 'default' | 'numeric' | 'email-address'
  placeholder?: string | null
  helpText?: string | null
  error?: string | null
  secureTextEntry?: boolean
}) {
  const theme = useTheme()

  return (
    <View style={styles.field}>
      <Label label={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChange}
        testID={testID}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder ?? undefined}
        placeholderTextColor="#9ca3af"
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { borderRadius: theme.radius.md, borderColor: error ? '#b91c1c' : '#d1d5db' },
        ]}
      />
      {helpText ? <Text style={styles.help}>{helpText}</Text> : null}
      {error ? (
        <Text style={styles.error} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * Select e multiselect como fileira de pastilhas, não como picker nativo.
 *
 * As listas de prontuário são curtas — sim/não, lateralidade, uma lista de
 * alergias — e um picker esconde as opções atrás de um toque e de uma folha
 * modal. Com as opções à vista, marcar é um toque só, que é o que importa
 * quando se preenche de pé entre uma paciente e outra.
 */
export function ChoiceField({
  label,
  options,
  selected,
  onToggle,
  testID,
  // Sem padrão, ao contrário do `TextField`: um campo de escolha que não diz
  // se é obrigatório é uma omissão, não uma preferência — e todos os
  // chamadores já informavam.
  required,
  multiple = false,
  helpText,
  error,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
  testID: string
  required: boolean
  multiple?: boolean
  helpText?: string | null
  error?: string | null
}) {
  const theme = useTheme()

  return (
    <View style={styles.field} testID={testID}>
      <Label label={label} required={required} />
      <View style={styles.choices}>
        {options.map((option) => {
          const isOn = selected.includes(option.value)
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isOn }}
              onPress={() => onToggle(option.value)}
              testID={`${testID}-${option.value}`}
              style={[
                styles.choice,
                {
                  borderRadius: theme.radius.xl,
                  borderColor: isOn ? theme.accent : '#d1d5db',
                  backgroundColor: isOn ? theme.accent : 'transparent',
                },
              ]}
            >
              <Text style={{ color: isOn ? '#ffffff' : '#374151', fontWeight: isOn ? '600' : '400' }}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {helpText ? <Text style={styles.help}>{helpText}</Text> : null}
      {error ? (
        <Text style={styles.error} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#b91c1c' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 48,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  help: { fontSize: 12, color: '#6b7280' },
  error: { fontSize: 12, color: '#b91c1c' },
})
