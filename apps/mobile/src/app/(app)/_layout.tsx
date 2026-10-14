import { Stack } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { ThemeToggle } from '../../components/ui/theme-toggle'
import { logout } from '../../features/auth/auth.service'
import { useSessionStore } from '../../features/auth/session.store'
import { useTheme } from '../../theme/theme-context'

function LogoutButton() {
  const theme = useTheme()
  const setAnonymous = useSessionStore((state) => state.setAnonymous)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={async () => {
        await logout()
        setAnonymous()
      }}
      testID="header-logout"
      hitSlop={12}
    >
      <Text style={{ color: theme.accent, fontWeight: '600' }}>Sair</Text>
    </Pressable>
  )
}

export default function AuthenticatedLayout() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Agenda',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <ThemeToggle />
              <LogoutButton />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="appointments/[id]/index"
        options={{ title: 'Consulta', headerRight: () => <ThemeToggle /> }}
      />
      <Stack.Screen
        name="appointments/[id]/medical-record"
        options={{ title: 'Prontuário', headerRight: () => <ThemeToggle /> }}
      />
    </Stack>
  )
}
