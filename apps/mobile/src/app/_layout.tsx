import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { fetchCurrentUser } from '../features/auth/auth.service'
import { useSessionStore } from '../features/auth/session.store'
import { readSession } from '../lib/token-storage'
import { setOnSessionExpired } from '../lib/api-client'
import { ThemeProvider } from '../theme/theme-context'
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
    if (!bootstrapped) return

    const inAuthenticatedArea = segments[0] === '(app)'

    if (status === 'authenticated' && !inAuthenticatedArea) router.replace('/(app)')
    if (status === 'anonymous' && inAuthenticatedArea) router.replace('/login')
  }, [bootstrapped, status, segments, router])

  return <Slot />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="auto" />
          <SessionGate />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
