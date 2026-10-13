import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from '../theme/theme-context'

/**
 * Os mesmos providers do layout raiz, menos o que é de navegação.
 *
 * `retry: false` porque a configuração real repete uma vez: num teste de erro
 * isso dobra o tempo e, pior, esconde a tela de erro atrás de uma segunda
 * tentativa que ainda está carregando.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: 0 },
    },
  })
}

// O SafeAreaProvider precisa de medidas: sem elas os filhos nunca aparecem.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}

// `render` é assíncrono no RNTL 14 — quem chama precisa esperar, senão a
// árvore ainda não montou quando a primeira asserção roda.
export function renderWithProviders(ui: ReactElement) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={METRICS}>
        <QueryClientProvider client={makeClient()}>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
