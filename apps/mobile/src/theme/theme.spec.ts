import { SURFACE_PALETTE, ThemeBorderRadius } from '@app/shared'
import { buildTheme, DEFAULT_ACCENT } from './theme'

const ACCENT = '#2F6F6B'
const clinic = { accentColor: ACCENT, accentSoftColor: '#E3F1F0' }

describe('buildTheme — o que vem da clínica', () => {
  // O ponto de as funções estarem no @app/shared: a mesma clínica não pode
  // parecer uma no site e outra no celular. Se a derivação divergir, quebra.
  it('no claro, usa o acento da clínica como está', () => {
    expect(buildTheme(clinic, false).accent).toBe(ACCENT)
  })

  it('no escuro, clareia o acento', () => {
    const dark = buildTheme(clinic, true)

    expect(dark.accent).not.toBe(ACCENT)
    expect(dark.accent).toMatch(/^#[0-9a-f]{6}$/)
    expect(dark.isDark).toBe(true)
  })

  // A web lê `accentSoftColor` da API; derivar aqui faria as duas divergirem.
  it('no claro, o acento suave é o campo da clínica, não uma derivação', () => {
    expect(buildTheme(clinic, false).accentSoft).toBe('#E3F1F0')
  })

  it('no escuro, o acento suave é derivado', () => {
    expect(buildTheme(clinic, true).accentSoft).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('cai no próprio acento quando a clínica não configurou o suave', () => {
    expect(buildTheme({ accentColor: ACCENT }, false).accentSoft).toBe(ACCENT)
  })

  it('tinge o fundo com o acento quando a clínica não o define', () => {
    const light = buildTheme(clinic, false)
    const dark = buildTheme(clinic, true)

    expect(light.bg).toMatch(/^rgb\(/)
    expect(dark.bg).toMatch(/^rgb\(/)
    expect(light.bg).not.toBe(dark.bg)
  })

  it('respeita o fundo que a clínica definiu, claro e escuro', () => {
    const custom = { ...clinic, bgColor: '#FFFDF8', bgDarkColor: '#0B1020' }

    expect(buildTheme(custom, false).bg).toBe('#FFFDF8')
    expect(buildTheme(custom, true).bg).toBe('#0B1020')
  })

  it('cada preset de raio dá uma escala diferente', () => {
    expect(buildTheme({ ...clinic, borderRadius: ThemeBorderRadius.SHARP }, false).radius.md).toBe(4)
    expect(buildTheme({ ...clinic, borderRadius: ThemeBorderRadius.ROUND }, false).radius.md).toBe(16)
  })

  // `borderRadius: '16px'` é ignorado em silêncio pelo RN: o canto fica reto e
  // nada avisa. A escala inteira tem de sair daqui em número.
  it('entrega a escala inteira em número, não na string com px', () => {
    const radius = buildTheme(clinic, false).radius

    expect(Object.values(radius)).toEqual([4, 6, 8, 12, 16])
    Object.values(radius).forEach((value) => expect(typeof value).toBe('number'))
  })

  it('tem um acento padrão para antes de a clínica ser conhecida', () => {
    expect(DEFAULT_ACCENT).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(buildTheme({}, false).accent).toBe(DEFAULT_ACCENT)
  })
})

/**
 * O buraco que a primeira versão deixou: estes tokens existiam só no CSS da
 * web, e o app acabou com os cinzas padrão do Tailwind. É o que fazia a tela
 * do celular não parecer o mesmo produto.
 */
describe('buildTheme — o que vem da plataforma', () => {
  it.each(Object.keys(SURFACE_PALETTE) as (keyof typeof SURFACE_PALETTE)[])(
    '%s sai do @app/shared, não de um valor local',
    (token) => {
      expect(buildTheme(clinic, false)[token]).toBe(SURFACE_PALETTE[token].light)
      expect(buildTheme(clinic, true)[token]).toBe(SURFACE_PALETTE[token].dark)
    },
  )

  it('não sobra nenhuma cor inventada entre os tokens de superfície', () => {
    const theme = buildTheme(clinic, false)
    const fromPalette = Object.keys(SURFACE_PALETTE)

    fromPalette.forEach((token) =>
      expect(Object.values(SURFACE_PALETTE).map((p) => p.light)).toContain(
        theme[token as keyof typeof SURFACE_PALETTE],
      ),
    )
  })

  // Três níveis escolhidos, não calculados: opacidade sobre `text` daria
  // outra cor, e a web distingue conteúdo, secundário e rótulo.
  it.each(['text', 'textDim', 'textMute'] as const)(
    '%s é um token próprio, não uma opacidade',
    (token) => {
      expect(buildTheme(clinic, false)[token]).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(buildTheme(clinic, true)[token]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    },
  )
})
