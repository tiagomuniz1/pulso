import {
  computeBgDark,
  computeBgLight,
  computeDarkAccent,
  computeDarkSoft,
  SURFACE_PALETTE,
  THEME_RADIUS_PRESETS,
  ThemeBorderRadius,
  type SurfaceToken,
} from '@app/shared'

/**
 * Os tokens do tema, derivados exatamente como na web.
 *
 * Dois grupos, e a diferença importa:
 *
 * - **Da clínica** — acento, acento suave, fundo e raio. Vêm do tema que ela
 *   configura e mudam de clínica para clínica. As quatro funções de derivação
 *   vivem no `@app/shared` justamente para a mesma clínica não parecer uma no
 *   site e outra no celular.
 * - **Da plataforma** — superfície, linha, os três níveis de texto e os pares
 *   semânticos. São fixos, iguais em toda clínica, e saem do `@app/shared`.
 *
 * Texto tem três níveis e nenhum deles é opacidade: `text` para o conteúdo,
 * `textDim` para o secundário, `textMute` para rótulo e legenda. Os tons foram
 * escolhidos, não calculados — apagar `text` com alpha dá outra cor.
 */

/** Acento usado antes de a clínica ser conhecida — a tela de login. */
export const DEFAULT_ACCENT = '#2F6F6B'

export interface RadiusScale {
  sm: number
  default: number
  md: number
  lg: number
  xl: number
}

/** O tema da clínica, como o backend o devolve. Tudo opcional: antes do login não há. */
export interface ClinicTheme {
  accentColor?: string
  accentSoftColor?: string
  bgColor?: string | null
  bgDarkColor?: string | null
  borderRadius?: ThemeBorderRadius | null
}

export type ThemeTokens = {
  accent: string
  accentSoft: string
  bg: string
  radius: RadiusScale
  isDark: boolean
} & Record<SurfaceToken, string>

/**
 * Raio em número, não na string com `px` que o shared guarda.
 *
 * `borderRadius: '16px'` é ignorado em silêncio pelo React Native — o canto
 * fica reto e nada avisa. A conversão acontece aqui, uma vez, e não em cada
 * `StyleSheet`: um token que só funciona se todo consumidor lembrar de
 * converter é uma armadilha esperando o componente número vinte.
 */
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

function surfaces(isDark: boolean): Record<SurfaceToken, string> {
  const entries = Object.entries(SURFACE_PALETTE).map(([token, pair]) => [
    token,
    isDark ? pair.dark : pair.light,
  ])
  return Object.fromEntries(entries) as Record<SurfaceToken, string>
}

export function buildTheme(clinic: ClinicTheme, isDark: boolean): ThemeTokens {
  const accentColor = clinic.accentColor ?? DEFAULT_ACCENT
  const palette = surfaces(isDark)

  return {
    ...palette,
    accent: isDark ? computeDarkAccent(accentColor) : accentColor,
    // No claro é o campo que a clínica configura, não uma derivação: a web lê
    // `accentSoftColor` da API, e derivar aqui faria as duas divergirem.
    accentSoft: isDark
      ? computeDarkSoft(accentColor)
      : (clinic.accentSoftColor ?? accentColor),
    bg: isDark
      ? (clinic.bgDarkColor ?? computeBgDark(accentColor))
      : (clinic.bgColor ?? computeBgLight(accentColor)),
    radius: toRadiusScale(clinic.borderRadius ?? ThemeBorderRadius.DEFAULT),
    isDark,
  }
}
