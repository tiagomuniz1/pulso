import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { ThemeBorderRadius } from '@app/shared'
import { buildTheme, DEFAULT_ACCENT, type ThemeTokens } from './theme'

interface ThemeProviderProps {
  children: ReactNode
  /** Acento da clínica. Enquanto ela não é conhecida, cai no padrão. */
  accentHex?: string
  borderRadius?: ThemeBorderRadius
}

const ThemeContext = createContext<ThemeTokens | null>(null)

export function ThemeProvider({
  children,
  accentHex = DEFAULT_ACCENT,
  borderRadius = ThemeBorderRadius.DEFAULT,
}: ThemeProviderProps) {
  // O app acompanha o sistema, como a web acompanha `prefers-color-scheme`.
  const scheme = useColorScheme()
  const tokens = useMemo(
    () => buildTheme(accentHex, borderRadius, scheme === 'dark'),
    [accentHex, borderRadius, scheme],
  )

  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeTokens {
  const tokens = useContext(ThemeContext)
  // Lançar em vez de devolver um padrão: um componente fora do provider
  // renderizaria com as cores erradas e ninguém notaria até a clínica reclamar.
  if (!tokens) throw new Error('useTheme precisa estar dentro de ThemeProvider')
  return tokens
}
