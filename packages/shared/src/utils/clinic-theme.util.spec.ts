import { ThemeBorderRadius } from '../enums/theme-border-radius.enum'
import {
  computeBgDark,
  computeBgLight,
  computeDarkAccent,
  computeDarkSoft,
  THEME_RADIUS_PRESETS,
} from './clinic-theme.util'

/**
 * As quatro derivações do tema da clínica.
 *
 * Moraram no spec do hook da web até agora, o que escondia duas coisas: que
 * o código é do `shared` e vale igual no app, e que ninguém o executava
 * depois que o pacote ganhou runner próprio. Aqui elas ficam com o código
 * que provam.
 *
 * As asserções são de faixa, e não de hex exato, de propósito: o que
 * importa é a direção — clarear, escurecer, tingir — e um valor cravado
 * transformaria qualquer ajuste de 1% numa quebra de teste.
 */

describe('computeDarkAccent', () => {
  it('lightens and desaturates blue accent for dark mode', () => {
    const result = computeDarkAccent('#2563EB')
    const r = parseInt(result.slice(1, 3), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBeGreaterThan(37)
    expect(b).toBeGreaterThan(235)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('lightens rose accent for dark mode', () => {
    const result = computeDarkAccent('#E11D48')
    const rSource = 0xe1
    const rResult = parseInt(result.slice(1, 3), 16)
    expect(rResult).toBeGreaterThan(rSource)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a valid 6-digit hex string', () => {
    expect(computeDarkAccent('#000000')).toMatch(/^#[0-9a-f]{6}$/)
    expect(computeDarkAccent('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('computeDarkSoft', () => {
  it('produces a very dark tinted color from blue accent', () => {
    const result = computeDarkSoft('#2563EB')
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBeLessThan(60)
    expect(g).toBeLessThan(60)
    expect(b).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('produces a very dark tinted color from rose accent', () => {
    const result = computeDarkSoft('#E11D48')
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeLessThan(60)
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns a valid 6-digit hex string', () => {
    expect(computeDarkSoft('#000000')).toMatch(/^#[0-9a-f]{6}$/)
    expect(computeDarkSoft('#FFFFFF')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('computeBgLight', () => {
  it('returns a color very close to the base bg (#F7F6F3)', () => {
    const result = computeBgLight('#2563EB')
    // rgb(...) format
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const [r, g, b] = result.match(/\d+/g)!.map(Number)
    // should stay close to base 247/246/243 — 4% shift at most ~9 units
    expect(r).toBeGreaterThanOrEqual(238)
    expect(g).toBeGreaterThanOrEqual(237)
    expect(b).toBeGreaterThanOrEqual(234)
  })

  it('produces a warmer tint for a warm accent (rose)', () => {
    const result = computeBgLight('#E11D48')
    const [r, , b] = result.match(/\d+/g)!.map(Number)
    // red channel should be higher than blue due to warm accent
    expect(r).toBeGreaterThan(b)
  })
})

describe('computeBgDark', () => {
  it('returns a color very close to the base dark bg (#0B1220)', () => {
    const result = computeBgDark('#2563EB')
    expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
    const [r, g, b] = result.match(/\d+/g)!.map(Number)
    // should stay close to base 11/18/32 — 4% shift at most ~9 units
    expect(r).toBeLessThan(21)
    expect(g).toBeLessThan(28)
    expect(b).toBeLessThan(42)
  })

  it('shifts red channel more than blue channel for a warm accent (rose)', () => {
    const result = computeBgDark('#E11D48')
    const [r, , b] = result.match(/\d+/g)!.map(Number)
    // Dark base is #0B1220 (r=11, b=32). Rose accent (r=225, b=72) shifts red more.
    const rShift = r - 11
    const bShift = b - 32
    expect(rShift).toBeGreaterThan(bShift)
  })
})

describe('THEME_RADIUS_PRESETS', () => {
  it('tem uma escala para cada preset', () => {
    Object.values(ThemeBorderRadius).forEach((preset) => {
      expect(THEME_RADIUS_PRESETS[preset]).toBeDefined()
    })
  })

  // Em px porque é a unidade que web e React Native entendem igual — `rem`
  // não existe no nativo.
  it('mede tudo em px, e em escala crescente', () => {
    Object.values(THEME_RADIUS_PRESETS).forEach((scale) => {
      const values = [scale.sm, scale.default, scale.md, scale.lg, scale.xl]
      values.forEach((value) => expect(value).toMatch(/^\d+px$/))

      const numbers = values.map((value) => Number.parseInt(value, 10))
      numbers.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(numbers[index]))
    })
  })
})
