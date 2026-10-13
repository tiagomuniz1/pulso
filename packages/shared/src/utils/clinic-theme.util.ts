import { ThemeBorderRadius } from '../enums/theme-border-radius.enum'

/**
 * Derivação do tema da clínica, a partir de uma única cor de acento.
 *
 * Vive no shared porque o contrato é de plataforma, não de navegador: a web
 * injeta o resultado em variáveis CSS, o app nativo alimenta um contexto de
 * tema, e os dois precisam derivar exatamente as mesmas cores. Uma clínica não
 * pode parecer uma no site e outra no celular.
 *
 * As funções são puras e trabalham em hex `#rrggbb`.
 */

/** Mistura o acento com branco a 40% — variante clara, para fundo escuro. */
export function computeDarkAccent(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.4
  const dr = Math.round(r + (255 - r) * t)
  const dg = Math.round(g + (255 - g) * t)
  const db = Math.round(b + (255 - b) * t)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

/** 18% do acento + deslocamento de base — fundo tingido muito escuro. */
export function computeDarkSoft(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const factor = 0.18
  const base = 6
  const dr = Math.min(255, Math.round(r * factor + base))
  const dg = Math.min(255, Math.round(g * factor + base))
  const db = Math.min(255, Math.round(b * factor + base))
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

/** 4% do acento sobre o papel claro — a tela inteira "respira" a marca. */
export function computeBgLight(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.04
  const br = Math.round(247 * (1 - t) + r * t)
  const bg = Math.round(246 * (1 - t) + g * t)
  const bb = Math.round(243 * (1 - t) + b * t)
  return `rgb(${br},${bg},${bb})`
}

/** O mesmo tingimento de 4%, sobre o papel escuro. */
export function computeBgDark(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.04
  const br = Math.round(11 * (1 - t) + r * t)
  const bg = Math.round(18 * (1 - t) + g * t)
  const bb = Math.round(32 * (1 - t) + b * t)
  return `rgb(${br},${bg},${bb})`
}

export interface ThemeRadiusScale {
  sm: string
  default: string
  md: string
  lg: string
  xl: string
}

/**
 * Escala de raio por preset. Em px porque é a unidade que web e RN entendem
 * igual — `rem` não existe em React Native.
 */
export const THEME_RADIUS_PRESETS: Record<ThemeBorderRadius, ThemeRadiusScale> = {
  [ThemeBorderRadius.SHARP]: { sm: '2px', default: '3px', md: '4px', lg: '6px', xl: '8px' },
  [ThemeBorderRadius.DEFAULT]: { sm: '4px', default: '6px', md: '8px', lg: '12px', xl: '16px' },
  [ThemeBorderRadius.ROUND]: { sm: '8px', default: '12px', md: '16px', lg: '24px', xl: '32px' },
}
