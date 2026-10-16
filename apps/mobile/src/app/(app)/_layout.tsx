import { Stack } from 'expo-router'
import { View } from 'react-native'
import { AppDrawer } from '../../features/navigation/app-drawer'
import { AppHeader } from '../../features/navigation/app-header'
import { useTheme } from '../../theme/theme-context'

/**
 * A moldura que a web tem em celular: barra de topo com hamburger, e o menu
 * como gaveta por cima.
 *
 * O cabeçalho é nosso e não o do `Stack` porque ele é o mesmo em todas as
 * telas — como a barra fixa da web — enquanto o do `Stack` muda de título e
 * ganha o botão de voltar. As telas internas usam o do `Stack`; a raiz, este.
 */
export default function AuthenticatedLayout() {
  const theme = useTheme()

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader />
      <AppDrawer activeId="appointments" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.accent,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* A consulta traz o próprio cabeçalho, com voltar e situação. */}
        <Stack.Screen name="appointments/[id]/index" options={{ headerShown: false }} />
      </Stack>
    </View>
  )
}
