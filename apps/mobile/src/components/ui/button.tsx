import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'

type Variant = 'primary' | 'outline' | 'danger'

/**
 * Alvo de toque de 48pt mesmo quando o rótulo é curto: o dedo não tem a mira
 * do ponteiro, e esta tela é usada em pé, com uma mão só.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  testID: string
}) {
  const theme = useTheme()
  const isBlocked = disabled || loading

  const palette = {
    primary: { background: theme.accent, border: theme.accent, text: theme.surface },
    outline: { background: 'transparent', border: theme.accent, text: theme.accent },
    danger: { background: 'transparent', border: theme.danger, text: theme.danger },
  }[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      disabled={isBlocked}
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radius.md,
          opacity: isBlocked ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} testID={`${testID}-spinner`} />
      ) : (
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { fontSize: 15, fontWeight: '600' },
})
