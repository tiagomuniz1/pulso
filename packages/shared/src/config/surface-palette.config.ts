
/**
 * As cores que não vêm da clínica, claro e escuro.
 *
 * O acento, o acento suave, o fundo e o raio saem do tema que a clínica
 * configura — estes não. Superfície, linha, texto e os semânticos são a
 * identidade da plataforma, iguais em toda clínica, e por isso são fixos.
 *
 * Estavam só em `globals.css`, como variáveis CSS: serve à web e deixa o app
 * sem nada. A primeira versão do celular acabou com os cinzas padrão do
 * Tailwind, que não são os da Pulso — é o que fazia a tela não parecer o
 * mesmo produto. A segunda tentativa portou oito dos quinze, por eu ter
 * listado à mão o que achava que existia; por isso **este arquivo é gerado a
 * partir do CSS**, e um spec do frontend compara os dois.
 *
 * Três níveis de texto, não dois: `text` para o conteúdo, `textDim` para o
 * secundário e `textMute` para rótulo e legenda. Opacidade sobre `text` não
 * substitui nenhum dos dois — os tons foram escolhidos, não calculados.
 *
 * Os pares `*Soft` são o fundo da pastilha cujo texto é a cor cheia.
 */
export interface IPaletteEntry {
  light: string
  dark: string
}

export const SURFACE_PALETTE = {
  surface: { light: '#FFFFFF', dark: '#111A2E' },
  surface2: { light: '#FBFAF7', dark: '#162241' },
  line: { light: '#E8E4DB', dark: '#1F2B47' },
  lineStrong: { light: '#D8D2C4', dark: '#2A3960' },
  text: { light: '#1A1D29', dark: '#E8EEFA' },
  textDim: { light: '#555A6B', dark: '#9AA8C7' },
  textMute: { light: '#8B8E9A', dark: '#6B7A9E' },
  warm: { light: '#C47B8A', dark: '#F2B8B5' },
  warmSoft: { light: '#F6E5E8', dark: '#2E1B22' },
  good: { light: '#2F8A67', dark: '#7BD6B0' },
  goodSoft: { light: '#DEF0E7', dark: '#142F26' },
  warn: { light: '#B8872A', dark: '#F5CB6B' },
  warnSoft: { light: '#F8EDD3', dark: '#2E2410' },
  danger: { light: '#C14E45', dark: '#F2786A' },
  dangerSoft: { light: '#F7DED9', dark: '#2F1715' },
} as const satisfies Record<string, IPaletteEntry>

export type SurfaceToken = keyof typeof SURFACE_PALETTE
