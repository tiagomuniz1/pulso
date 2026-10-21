import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Feather from '@expo/vector-icons/Feather'
import { useRouter } from 'expo-router'
import { useSessionStore } from '../auth/session.store'
import { useTheme } from '../../theme/theme-context'
import { initialsOf, navigationItemsFor } from './navigation-items'
import { useNavigationStore } from './navigation.store'

/**
 * O menu lateral da web, como gaveta.
 *
 * Na web ele é uma `<aside>` fixa que vira gaveta abaixo do ponto de quebra;
 * aqui só existe a gaveta, porque só existe o celular. O retângulo escuro por
 * cima do resto fecha ao toque, igual ao `sidebar-backdrop`.
 */
export function AppDrawer({ activeId }: { activeId: string }) {
  const theme = useTheme()
  const router = useRouter()
  const user = useSessionStore((state) => state.user)
  const isOpen = useNavigationStore((state) => state.isDrawerOpen)
  const close = useNavigationStore((state) => state.closeDrawer)

  const items = navigationItemsFor(user?.role)

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.panel, { backgroundColor: theme.bg, borderColor: theme.line }]}>
          <Text style={[styles.brand, { color: theme.accent }]} testID="drawer-brand">
            pulso
          </Text>

          <ScrollView contentContainerStyle={styles.items} testID="drawer-items">
            {items.map((item) => {
              const isActive = item.id === activeId
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    close()
                    router.replace(item.route as never)
                  }}
                  testID={`drawer-item-${item.id}`}
                  style={[
                    styles.item,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: isActive ? theme.accentSoft : 'transparent',
                    },
                  ]}
                >
                  <Feather
                    name={item.icon as never}
                    size={18}
                    color={isActive ? theme.accent : theme.textDim}
                  />
                  <Text style={{ color: isActive ? theme.accent : theme.textDim, fontSize: 15 }}>
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {user ? (
            <View style={[styles.footer, { borderColor: theme.line }]} testID="drawer-user">
              <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>
                  {initialsOf(user.fullName)}
                </Text>
              </View>
              <View style={styles.userText}>
                <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                  {user.fullName}
                </Text>
                <Text style={[styles.userEmail, { color: theme.textMute }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>
          ) : null}
        </SafeAreaView>

        <Pressable
          accessibilityLabel="Fechar menu"
          onPress={close}
          style={styles.backdrop}
          testID="drawer-backdrop"
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  panel: { width: 264, borderRightWidth: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  brand: { fontSize: 28, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  items: { paddingHorizontal: 12, gap: 2, paddingBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 44 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  userText: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '500' },
  userEmail: { fontSize: 11 },
})
