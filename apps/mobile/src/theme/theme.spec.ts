import { ThemeBorderRadius } from '@app/shared'
import { buildTheme, DEFAULT_ACCENT } from './theme'

const ACCENT = '#2F6F6B'

describe('theme', () => {
  // O ponto de ter as funções em @app/shared: a mesma clínica não pode parecer
  // uma no site e outra no celular. Se a derivação divergir, isto quebra.
  it('no claro, usa o acento da clínica como está', () => {
    expect(buildTheme(ACCENT, ThemeBorderRadius.DEFAULT, false).accent).toBe(ACCENT)
  })

  it('no escuro, clareia o acento', () => {
    const dark = buildTheme(ACCENT, ThemeBorderRadius.DEFAULT, true)

    expect(dark.accent).not.toBe(ACCENT)
    expect(dark.accent).toMatch(/^#[0-9a-f]{6}$/)
    expect(dark.isDark).toBe(true)
  })

  it('tinge o fundo com o acento, claro e escuro', () => {
    const light = buildTheme(ACCENT, ThemeBorderRadius.DEFAULT, false)
    const dark = buildTheme(ACCENT, ThemeBorderRadius.DEFAULT, true)

    expect(light.bg).toMatch(/^rgb\(/)
    expect(dark.bg).toMatch(/^rgb\(/)
    expect(light.bg).not.toBe(dark.bg)
  })

  it('cada preset de raio dá uma escala diferente', () => {
    const sharp = buildTheme(ACCENT, ThemeBorderRadius.SHARP, false).radius
    const round = buildTheme(ACCENT, ThemeBorderRadius.ROUND, false).radius

    expect(sharp.md).toBe(4)
    expect(round.md).toBe(16)
  })

  // `borderRadius: '16px'` é ignorado em silêncio pelo RN: o canto fica reto e
  // nada avisa. A escala inteira tem de sair daqui em número.
  it('entrega a escala inteira em número, não na string com px', () => {
    const radius = buildTheme(ACCENT, ThemeBorderRadius.DEFAULT, false).radius

    expect(Object.values(radius)).toEqual([4, 6, 8, 12, 16])
    Object.values(radius).forEach((value) => expect(typeof value).toBe('number'))
  })

  it('tem um acento padrão para antes de a clínica ser conhecida', () => {
    expect(DEFAULT_ACCENT).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})
