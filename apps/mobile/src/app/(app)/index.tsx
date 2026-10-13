import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { logout } from '../../features/auth/auth.service'
import { useSessionStore } from '../../features/auth/session.store'
import { useTheme } from '../../theme/theme-context'

/**
 * Tela provisória da fase 1.
 *
 * Não é produto: existe para provar o caminho inteiro de ponta a ponta —
 * login por `/auth/token`, token no Keychain, `Bearer` numa rota autenticada
 * (`/auth/me`, que é de onde vem este nome) e logout revogando no servidor.
 * A agenda do dia entra aqui na fase 2.
 */
export default function HomeScreen() {
  const theme = useTheme()
  const user = useSessionStore((state) => state.user)
  const setAnonymous = useSessionStore((state) => state.setAnonymous)

  async function handleLogout() {
    await logout()
    setAnonymous()
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.greeting, { color: theme.accent }]} testID="home-greeting">
          Olá, {user?.fullName ?? ''}
        </Text>
        <Text style={styles.detail} testID="home-role">
          {user?.email} · {user?.role}
        </Text>

        <Pressable
          onPress={handleLogout}
          style={[styles.button, { borderColor: theme.accent, borderRadius: theme.radius.md }]}
          testID="home-logout"
        >
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  greeting: { fontSize: 24, fontWeight: '700' },
  detail: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  button: { borderWidth: 1, padding: 14, alignItems: 'center' },
})
