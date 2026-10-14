import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { useThemeStore } from '../../theme/theme.store'

/**
 * Alterna claro e escuro.
 *
 * Mesmo lugar conceitual do botão da web, que mora na sidebar: ao lado do
 * resto do que é "do aplicativo", não do atendimento. Aqui isso é o cabeçalho.
 *
 * Texto e não ícone: o app ainda não tem conjunto de ícones, e um emoji
 * renderiza diferente em cada aparelho — pior do que uma palavra.
 */
export function ThemeToggle() {
  const theme = useTheme()
  const mode = useThemeStore((state) => state.mode)
  const toggleMode = useThemeStore((state) => state.toggleMode)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      onPress={toggleMode}
      testID="theme-toggle"
      hitSlop={12}
    >
      <Text style={{ color: theme.accent, fontWeight: '600' }}>
        {mode === 'dark' ? 'Claro' : 'Escuro'}
      </Text>
    </Pressable>
  )
}
