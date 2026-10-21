import { useEffect, useState } from 'react'
import { Slot, useRootNavigationState, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { fetchCurrentUser } from '../features/auth/auth.service'
import { useSessionStore } from '../features/auth/session.store'
import { readSession } from '../lib/token-storage'
import { setOnSessionExpired } from '../lib/api-client'
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

function SessionGate() {
  const status = useSessionStore((state) => state.status)
  const setAuthenticated = useSessionStore((state) => state.setAuthenticated)
  const setAnonymous = useSessionStore((state) => state.setAnonymous)
  const segments = useSegments()
  const router = useRouter()
  /**
   * A navegação só existe depois que o navegador raiz monta.
   *
   * Sem esperar por ela, o primeiro `replace` acontece cedo demais e o
   * React avisa "state update on a component that hasn't mounted yet" — em
   * produção é só ruído, mas em desenvolvimento o LogBox **cobre a tela**,
   * e foi o que derrubou um fluxo Maestro depois de o cadastro ter dado
   * certo.
   */
  const navigationState = useRootNavigationState()
  const [bootstrapped, setBootstrapped] = useState(false)

  // Descobre, uma vez, se há sessão guardada no Keychain. Validar contra o
  // servidor em vez de confiar no token: ele pode ter sido revogado enquanto o
  // app estava fechado, e aí o usuário entraria numa tela que falha inteira.
  useEffect(() => {
    let active = true

    void (async () => {
      const stored = await readSession()
      if (!stored) {
        if (active) setAnonymous()
      } else {
        try {
          const user = await fetchCurrentUser()
          if (active) setAuthenticated(user)
        } catch {
          if (active) setAnonymous()
        }
      }
      if (active) setBootstrapped(true)
    })()

    return () => {
      active = false
    }
  }, [setAuthenticated, setAnonymous])

  // O api-client avisa quando o refresh falha de vez; a navegação reage.
  useEffect(() => {
    setOnSessionExpired(() => setAnonymous())
    return () => setOnSessionExpired(null)
  }, [setAnonymous])

  useEffect(() => {
    if (!bootstrapped || !navigationState?.key) return

    const inAuthenticatedArea = segments[0] === '(app)'

    if (status === 'authenticated' && !inAuthenticatedArea) router.replace('/(app)')
    if (status === 'anonymous' && inAuthenticatedArea) router.replace('/login')
  }, [bootstrapped, navigationState?.key, status, segments, router])

  return <Slot />
}

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
          <SessionGate />
        </ClinicTheme>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
