import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

/**
 * Cor vem do tema, geometria vem do `StyleSheet`.
 *
 * A separação não é estética: `StyleSheet.create` roda no escopo do módulo,
 * onde não há hook e portanto não há tema. Tudo que depende da clínica tem de
 * ser objeto em linha — e foi por tentar escapar disso que a primeira versão
 * acabou com os cinzas do Tailwind chumbados.
 */
export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  const theme = useTheme()
  return (
    <View
      style={[
        styles.card,
        { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface2 },
      ]}
      testID={testID}
    >
      {children}
    </View>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return <Text style={[styles.title, { color: theme.accent }]}>{children}</Text>
}


const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 17, fontWeight: '700' },
})
