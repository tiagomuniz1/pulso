import {
  computeBgDark,
  computeBgLight,
  computeDarkAccent,
  computeDarkSoft,
  THEME_RADIUS_PRESETS,
  ThemeBorderRadius,
} from '@app/shared'

/**
 * Tokens do tema da clínica, derivados exatamente como na web.
 *
 * As quatro funções de derivação vivem em `@app/shared` justamente para isto:
 * uma clínica não pode parecer uma no site e outra no celular. O que muda é só
 * a entrega — lá, variáveis CSS; aqui, um objeto que os componentes consomem.
 */

/** Acento padrão, usado antes de a clínica ser conhecida (tela de login). */
export const DEFAULT_ACCENT = '#2F6F6B'

/**
 * Raio em número, não na string com `px` que o shared guarda.
 *
 * A conversão acontece aqui, uma vez, e não em cada `StyleSheet`: `borderRadius:
 * '16px'` é ignorado em silêncio pelo RN — o canto fica reto e nada avisa. Um
 * token que só funciona se todo consumidor lembrar de converter é uma armadilha
 * esperando o componente número vinte.
 */
export interface RadiusScale {
  sm: number
  default: number
  md: number
  lg: number
  xl: number
}

export interface ThemeTokens {
  accent: string
  accentSoft: string
  bg: string
  radius: RadiusScale
  isDark: boolean
}

function toRadiusScale(borderRadius: ThemeBorderRadius): RadiusScale {
  const preset = THEME_RADIUS_PRESETS[borderRadius]
  return {
    sm: Number.parseInt(preset.sm, 10),
    default: Number.parseInt(preset.default, 10),
    md: Number.parseInt(preset.md, 10),
    lg: Number.parseInt(preset.lg, 10),
    xl: Number.parseInt(preset.xl, 10),
  }
}

export function buildTheme(
  accentHex: string,
  borderRadius: ThemeBorderRadius,
  isDark: boolean,
): ThemeTokens {
  return {
    accent: isDark ? computeDarkAccent(accentHex) : accentHex,
    accentSoft: isDark ? computeDarkSoft(accentHex) : accentHex,
    bg: isDark ? computeBgDark(accentHex) : computeBgLight(accentHex),
    radius: toRadiusScale(borderRadius),
    isDark,
  }
}
