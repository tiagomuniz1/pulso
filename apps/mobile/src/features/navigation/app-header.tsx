import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
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
 * O avatar abre o mesmo menu da web: "Meu perfil" e "Sair". Antes saía da
 * conta direto, porque a tela de perfil não existia e um menu de um item só
 * seria toque a mais pelo mesmo fim — agora existe, e sair sem querer ao
 * tocar no próprio nome seria o pior caminho possível.
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
  const router = useRouter()
  const [isMenuOpen, setMenuOpen] = useState(false)

  // O fundo e o botão de voltar do Android fecham o mesmo menu; duas cópias
  // da mesma linha seriam dois caminhos para testar o mesmo efeito.
  const closeMenu = () => setMenuOpen(false)

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
          accessibilityLabel="Abrir menu da conta"
          onPress={() => setMenuOpen(true)}
          testID="header-user"
          style={[styles.avatar, { backgroundColor: theme.accentSoft }]}
        >
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>
            {user ? initialsOf(user.fullName) : ''}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
          testID="header-user-menu-backdrop"
        />
        <View
          style={[
            styles.menu,
            {
              top: insets.top + 56,
              backgroundColor: theme.surface,
              borderColor: theme.line,
              borderRadius: theme.radius.md,
            },
          ]}
          testID="header-user-menu"
        >
          <Text style={[styles.menuName, { color: theme.text }]}>{user?.fullName ?? ''}</Text>
          <Text style={[styles.menuEmail, { color: theme.textMute }]}>{user?.email ?? ''}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              closeMenu()
              if (user) router.push(`/(app)/users/${user.id}/edit`)
            }}
            testID="header-profile"
            style={[styles.menuItem, { borderTopColor: theme.line }]}
          >
            <Feather name="user" size={16} color={theme.textDim} />
            <Text style={{ color: theme.text, fontSize: 14 }}>Meu perfil</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              closeMenu()
              await logout()
              setAnonymous()
            }}
            testID="header-logout"
            style={[styles.menuItem, { borderTopColor: theme.line }]}
          >
            <Feather name="log-out" size={16} color={theme.danger} />
            <Text style={{ color: theme.danger, fontSize: 14 }}>Sair</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 220,
    borderWidth: 1,
    paddingTop: 12,
  },
  menuName: { fontSize: 14, fontWeight: '600', paddingHorizontal: 14 },
  menuEmail: { fontSize: 12, paddingHorizontal: 14, paddingBottom: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
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
