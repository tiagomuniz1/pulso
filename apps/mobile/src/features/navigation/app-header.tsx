import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Feather from '@expo/vector-icons/Feather'
import { logout } from '../auth/auth.service'
import { useSessionStore } from '../auth/session.store'
import { useTheme } from '../../theme/theme-context'
import { useThemeStore } from '../../theme/theme.store'
import { initialsOf } from './navigation-items'
import { useNavigationStore } from './navigation.store'

/**
 * A barra de topo da web em celular: hamburger à esquerda, sol/lua e avatar à
 * direita, com uma linha embaixo.
 *
 * O avatar sai da conta ao ser tocado. Na web ele abre um menu com "Meu
 * perfil" e "Sair"; aqui só o segundo existe, porque a tela de perfil ainda
 * não foi portada — um menu de um item só seria toque a mais pelo mesmo fim.
 *
 * O recuo de topo é a área segura, e não um número: sem ele a barra encosta
 * no relógio do sistema e o avatar fica **metade sob a barra de status** —
 * no Android o toque cai nela e o botão de sair simplesmente não responde.
 */
export function AppHeader() {
  const theme = useTheme()
  const user = useSessionStore((state) => state.user)
  const setAnonymous = useSessionStore((state) => state.setAnonymous)
  const openDrawer = useNavigationStore((state) => state.openDrawer)
  const mode = useThemeStore((state) => state.mode)
  const toggleMode = useThemeStore((state) => state.toggleMode)
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[styles.header, { borderColor: theme.line, paddingTop: insets.top }]}
      testID="app-header"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
        onPress={openDrawer}
        testID="header-menu"
        hitSlop={12}
        style={styles.iconButton}
      >
        <Feather name="menu" size={22} color={theme.textDim} />
      </Pressable>

      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            mode === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'
          }
          onPress={toggleMode}
          testID="header-theme-toggle"
          hitSlop={12}
          style={styles.iconButton}
        >
          <Feather name={mode === 'dark' ? 'sun' : 'moon'} size={18} color={theme.textDim} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair"
          onPress={async () => {
            await logout()
            setAnonymous()
          }}
          testID="header-user"
          style={[styles.avatar, { backgroundColor: theme.accentSoft }]}
        >
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>
            {user ? initialsOf(user.fullName) : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // Altura mínima, não fixa: o recuo da área segura entra por cima dela.
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
})
