import { Stack, usePathname } from 'expo-router'
import { View } from 'react-native'
import { AppDrawer } from '../../features/navigation/app-drawer'
import { AppHeader } from '../../features/navigation/app-header'
import { useTheme } from '../../theme/theme-context'

/**
 * Qual item do menu aparece marcado.
 *
 * Vem do caminho, não de uma constante: com um item só a constante bastava,
 * e com cinco ela marcaria "Consultas" enquanto a pessoa lê a lista de
 * pacientes. O primeiro segmento depois de `(app)` é o id do item; a raiz é
 * a agenda.
 */
export function activeNavigationId(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0]
  return segment ?? 'appointments'
}

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
  const pathname = usePathname()

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader />
      <AppDrawer activeId={activeNavigationId(pathname)} />
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
        {/* Os cadastros trazem o próprio título e o próprio voltar, como as
            páginas da web, que abrem com um "← Voltar" no topo do conteúdo. */}
        <Stack.Screen name="patients/index" options={{ headerShown: false }} />
        <Stack.Screen name="patients/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="patients/new" options={{ headerShown: false }} />
        <Stack.Screen name="patients/[id]/edit" options={{ headerShown: false }} />
        <Stack.Screen name="patients/[id]/appointments" options={{ headerShown: false }} />
        <Stack.Screen name="users/index" options={{ headerShown: false }} />
        <Stack.Screen name="users/new" options={{ headerShown: false }} />
        <Stack.Screen name="users/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="users/[id]/edit" options={{ headerShown: false }} />
        <Stack.Screen name="professionals/index" options={{ headerShown: false }} />
        <Stack.Screen name="professionals/new" options={{ headerShown: false }} />
        <Stack.Screen name="professionals/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="professionals/[id]/edit" options={{ headerShown: false }} />
        <Stack.Screen name="schedules/index" options={{ headerShown: false }} />
        <Stack.Screen name="schedules/new" options={{ headerShown: false }} />
        <Stack.Screen name="schedules/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="schedules/[id]/edit" options={{ headerShown: false }} />
        <Stack.Screen name="appointment-labels/index" options={{ headerShown: false }} />
      </Stack>
    </View>
  )
}
