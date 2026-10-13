import { Stack } from 'expo-router'
import { useTheme } from '../../theme/theme-context'

export default function AuthenticatedLayout() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.accent,
        contentStyle: { backgroundColor: theme.bg },
      }}
    />
  )
}
