import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/theme-context'

/**
 * A moldura de toda tela: fundo do tema da clínica e a área segura do
 * aparelho. `edges` sem `bottom` nas telas com barra fixa embaixo — a barra
 * paga o próprio recorte, e pagar duas vezes deixa um vão cinza.
 */
export function Screen({
  children,
  testID,
  edges = ['top', 'bottom'],
}: {
  children: ReactNode
  testID?: string
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}) {
  const theme = useTheme()
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={edges} testID={testID}>
      {children}
    </SafeAreaView>
  )
}

export function ScreenScroll({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      {children}
    </ScrollView>
  )
}

export function LoadingState({ testID }: { testID: string }) {
  const theme = useTheme()
  return (
    <View style={styles.centered} testID={testID}>
      <ActivityIndicator color={theme.accent} />
    </View>
  )
}

/**
 * Erro com o que fazer a seguir.
 *
 * Nunca o `detail` técnico do backend: a profissional não tem o que fazer com
 * "Request failed with status code 500", e tentar de novo é a ação que
 * resolve a maior parte dos casos num celular — rede de consultório cai.
 */
export function ErrorState({
  testID,
  message,
  onRetry,
}: {
  testID: string
  message: string
  onRetry?: () => void
}) {
  const theme = useTheme()
  return (
    <View style={styles.centered} testID={testID}>
      <Text style={[styles.errorText, { color: theme.danger }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.retry, { borderColor: theme.accent, borderRadius: theme.radius.md }]}
          testID={`${testID}-retry`}
        >
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function EmptyState({ testID, message }: { testID: string; message: string }) {
  const theme = useTheme()
  return (
    <View style={styles.centered} testID={testID}>
      <Text style={[styles.emptyText, { color: theme.textDim }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { fontSize: 15, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  retry: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
})
