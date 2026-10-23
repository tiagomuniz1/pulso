import { Slot } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { SessionGate } from '../features/auth/session-gate'
import { useSessionStore } from '../features/auth/session.store'
import { ThemeProvider } from '../theme/theme-context'
import { useClinicTheme } from '../features/themes/use-clinic-theme.hook'
import { registerCoreApiClient } from '../lib/core-client'

// No escopo do módulo, antes de qualquer tela montar: os services do
// `@app/core` pedem o cliente na primeira chamada, e a agenda dispara a
// primeira query já no primeiro render.
registerCoreApiClient()

// Mesma configuração da web (`lib/react-query.config.ts`): mutations não
// repetem sozinhas, e um minuto de frescor evita refetch a cada foco de tela.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})

/**
 * Veste o app com a marca da clínica assim que há sessão.
 *
 * Dentro do `QueryClientProvider` e fora do `SessionGate`: precisa do React
 * Query para buscar, e precisa envolver a navegação inteira para que a troca
 * repinte tudo — inclusive o cabeçalho da pilha.
 *
 * Antes do login fica o acento padrão. Não é fallback de erro: é o que deve
 * aparecer quando ainda não se sabe de qual clínica é a pessoa.
 */
function ClinicTheme({ children }: { children: React.ReactNode }) {
  const status = useSessionStore((state) => state.status)
  const clinic = useClinicTheme(status === 'authenticated')

  return <ThemeProvider clinic={clinic}>{children}</ThemeProvider>
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClinicTheme>
          <StatusBar style="auto" />
          <SessionGate>
            <Slot />
          </SessionGate>
        </ClinicTheme>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
