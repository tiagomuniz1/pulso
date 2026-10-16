import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { buildTheme, type ClinicTheme, type ThemeTokens } from './theme'
import { useThemeStore } from './theme.store'

const ThemeContext = createContext<ThemeTokens | null>(null)

export function ThemeProvider({
  children,
  clinic,
}: {
  children: ReactNode
  /** O tema da clínica. Ausente antes do login, e aí vale o padrão. */
  clinic?: ClinicTheme
}) {
  // Do estado, não de `useColorScheme`: o sistema só dá a semente, e a partir
  // do primeiro toque no seletor vale o que a pessoa escolheu — igual à web.
  const isDark = useThemeStore((state) => state.mode) === 'dark'

  // `clinic` é memoizado na origem (`useClinicTheme`), então depender do
  // objeto inteiro é seguro — e é o que o lint pede.
  const tokens = useMemo(() => buildTheme(clinic ?? {}, isDark), [clinic, isDark])

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeTokens {
  const tokens = useContext(ThemeContext)
  // Lançar em vez de devolver um padrão: um componente fora do provider
  // renderizaria com as cores erradas e ninguém notaria até a clínica reclamar.
  if (!tokens) throw new Error('useTheme precisa estar dentro de ThemeProvider')
  return tokens
}
