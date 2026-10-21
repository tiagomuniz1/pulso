/**
 * A geometria dos gráficos, em funções puras.
 *
 * A web usa `recharts`, que desenha SVG do DOM e não existe aqui. O
 * substituto é `react-native-svg` com os caminhos calculados à mão — e
 * calcular à mão num arquivo próprio é o que torna o arco e a escala
 * testáveis sem montar tela nenhuma.
 */

/** A paleta dos gráficos, na ordem em que a web a usa. */
export const CHART_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#6b7280',
]

export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

export interface IDonutSegment {
  path: string
  color: string
  value: number
}

function polarPoint(center: number, radius: number, angleInDegrees: number) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  }
}

/**
 * Um anel de rosca, fatia a fatia.
 *
 * Começa no topo e anda no sentido horário, como o `startAngle={90}` da
 * web. Uma fatia que seria o anel inteiro vira **duas** meias-voltas: um
 * arco de 360° tem início e fim no mesmo ponto, e o SVG o desenha como
 * nada.
 */
export function donutSegments(
  values: { value: number; color?: string }[],
  options: { size: number; thickness: number },
): IDonutSegment[] {
  const total = values.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) return []

  const center = options.size / 2
  const outer = center
  const inner = center - options.thickness

  const segments: IDonutSegment[] = []
  let startAngle = 0

  values.forEach((item, index) => {
    if (item.value <= 0) return

    const sweep = (item.value / total) * 360
    const color = item.color ?? paletteColor(index)

    // Uma fatia que fecha o círculo é desenhada em duas metades.
    const parts = sweep >= 360 ? [180, 180] : [sweep]
    let angle = startAngle
    const pieces = parts.map((part) => {
      const piece = arcPath(center, outer, inner, angle, angle + part)
      angle += part
      return piece
    })

    segments.push({ path: pieces.join(' '), color, value: item.value })
    startAngle += sweep
  })

  return segments
}

function arcPath(
  center: number,
  outer: number,
  inner: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarPoint(center, outer, startAngle)
  const outerEnd = polarPoint(center, outer, endAngle)
  const innerEnd = polarPoint(center, inner, endAngle)
  const innerStart = polarPoint(center, inner, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

export interface ILineGeometry {
  line: string
  area: string
  points: { x: number; y: number }[]
  maxValue: number
}

/**
 * A linha e a área sob ela.
 *
 * O eixo vertical sempre começa em zero e nunca tem altura zero: sem isso
 * um período inteiro sem atendimento vira uma divisão por zero, e a linha
 * sai como `NaN` — que o SVG desenha como nada, sem erro nenhum.
 */
export function lineGeometry(
  values: number[],
  options: { width: number; height: number },
): ILineGeometry {
  if (values.length === 0) {
    return { line: '', area: '', points: [], maxValue: 0 }
  }

  const maxValue = Math.max(...values, 0)
  const scale = maxValue > 0 ? maxValue : 1
  const step = values.length > 1 ? options.width / (values.length - 1) : 0

  const points = values.map((value, index) => ({
    x: values.length > 1 ? index * step : options.width / 2,
    y: options.height - (value / scale) * options.height,
  }))

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${line} L ${points[points.length - 1].x} ${options.height} L ${points[0].x} ${options.height} Z`

  return { line, area, points, maxValue }
}

/**
 * Os valores do eixo vertical.
 *
 * Inteiros, porque contagem de atendimento não tem metade — é o
 * `allowDecimals={false}` da web. Com um máximo menor que o número de
 * marcas pedido, devolve só os inteiros que cabem.
 */
export function axisTicks(maxValue: number, count: number): number[] {
  if (maxValue <= 0) return [0]

  const steps = Math.min(count, maxValue)
  const size = Math.ceil(maxValue / steps)
  const ticks: number[] = []
  for (let value = 0; value <= maxValue; value += size) ticks.push(value)
  return ticks
}

/**
 * Quais rótulos do eixo horizontal cabem.
 *
 * Trinta dias não cabem em 390px — a web mostra um a cada
 * `floor(total / 7)`, e o primeiro e o último sempre entram, porque são
 * eles que dizem de quando até quando.
 */
export function visibleTickIndexes(total: number, maximum: number): number[] {
  if (total === 0) return []
  if (total <= maximum) return Array.from({ length: total }, (_, index) => index)

  const step = Math.ceil(total / maximum)
  const indexes: number[] = []
  for (let index = 0; index < total; index += step) indexes.push(index)
  if (indexes[indexes.length - 1] !== total - 1) indexes.push(total - 1)
  return indexes
}

/** O período que a tela abre: os últimos trinta dias, como na web. */
export function defaultDateRange(today: Date): { from: Date; to: Date } {
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  return { from, to: today }
}

/** `Date` → `2026-10-21`, no fuso local — nunca `toISOString`, que é UTC. */
export function toApiDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
