import {
  axisTicks,
  CHART_PALETTE,
  defaultDateRange,
  donutSegments,
  lineGeometry,
  paletteColor,
  toApiDate,
  visibleTickIndexes,
} from './chart-geometry.util'

describe('paletteColor', () => {
  it('dá a cor da posição', () => {
    expect(paletteColor(0)).toBe(CHART_PALETTE[0])
  })

  // Uma clínica com mais especialidades do que cores não pode ficar sem
  // cor nenhuma — a paleta recomeça.
  it('recomeça a paleta quando os dados passam dela', () => {
    expect(paletteColor(CHART_PALETTE.length)).toBe(CHART_PALETTE[0])
  })
})

describe('donutSegments', () => {
  const options = { size: 100, thickness: 20 }

  it('uma fatia por valor', () => {
    const segments = donutSegments([{ value: 1 }, { value: 3 }], options)

    expect(segments).toHaveLength(2)
    expect(segments.map((s) => s.value)).toEqual([1, 3])
  })

  it('respeita a cor pedida', () => {
    expect(donutSegments([{ value: 1, color: '#abcdef' }], options)[0].color).toBe('#abcdef')
  })

  it('sem cor, usa a paleta pela posição', () => {
    const segments = donutSegments([{ value: 1 }, { value: 1 }], options)

    expect(segments.map((s) => s.color)).toEqual([CHART_PALETTE[0], CHART_PALETTE[1]])
  })

  // Total zero é o período sem dado nenhum: a tela mostra o aviso de
  // vazio, e desenhar um anel de fatias vazias seria um gráfico mentindo.
  it('sem total, não desenha nada', () => {
    expect(donutSegments([{ value: 0 }, { value: 0 }], options)).toEqual([])
  })

  it('valor zero no meio de outros não vira fatia', () => {
    const segments = donutSegments([{ value: 5 }, { value: 0 }, { value: 5 }], options)

    expect(segments).toHaveLength(2)
  })

  /**
   * Um arco de 360° tem início e fim no mesmo ponto, e o SVG o desenha
   * como nada. A fatia única é partida em duas metades — sem isso, um
   * período com um só tipo de procedimento mostraria a rosca vazia.
   */
  it('a fatia que fecha o círculo vira duas metades', () => {
    const [segment] = donutSegments([{ value: 7 }], options)

    expect(segment.path.match(/M /g)).toHaveLength(2)
  })

  it('a fatia maior que meia volta usa o arco longo', () => {
    const [big] = donutSegments([{ value: 3 }, { value: 1 }], options)

    expect(big.path).toMatch(/A 50 50 0 1 1/)
  })

  it('a fatia menor que meia volta usa o arco curto', () => {
    const [small] = donutSegments([{ value: 1 }, { value: 3 }], options)

    expect(small.path).toMatch(/A 50 50 0 0 1/)
  })

  // Começa no topo, como o `startAngle={90}` da web.
  it('começa no topo do círculo', () => {
    const [segment] = donutSegments([{ value: 1 }, { value: 1 }], options)

    expect(segment.path.startsWith('M 50 0')).toBe(true)
  })
})

describe('lineGeometry', () => {
  const options = { width: 100, height: 50 }

  it('sem valores, não desenha nada', () => {
    expect(lineGeometry([], options)).toEqual({ line: '', area: '', points: [], maxValue: 0 })
  })

  it('espalha os pontos pela largura', () => {
    const { points } = lineGeometry([0, 0, 0], options)

    expect(points.map((p) => p.x)).toEqual([0, 50, 100])
  })

  it('um valor só fica no meio', () => {
    expect(lineGeometry([3], options).points[0].x).toBe(50)
  })

  it('o maior valor encosta no topo e o zero na base', () => {
    const { points } = lineGeometry([0, 4], options)

    expect(points[0].y).toBe(50)
    expect(points[1].y).toBe(0)
  })

  /**
   * Um período inteiro sem atendimento tem máximo zero. Dividir por ele
   * faria a linha sair como `NaN` — que o SVG desenha como nada, sem erro
   * nenhum e sem ninguém perceber.
   */
  it('período todo zerado desenha a linha na base, não NaN', () => {
    const { line, points } = lineGeometry([0, 0, 0], options)

    expect(line).not.toMatch(/NaN/)
    expect(points.every((point) => point.y === 50)).toBe(true)
  })

  it('a área fecha pela base', () => {
    const { area } = lineGeometry([1, 2], options)

    expect(area.endsWith('L 100 50 L 0 50 Z')).toBe(true)
  })

  it('devolve o maior valor, para o eixo', () => {
    expect(lineGeometry([1, 9, 3], options).maxValue).toBe(9)
  })
})

describe('axisTicks', () => {
  it('máximo zero tem uma marca só', () => {
    expect(axisTicks(0, 4)).toEqual([0])
  })

  it('divide o eixo em marcas inteiras', () => {
    expect(axisTicks(8, 4)).toEqual([0, 2, 4, 6, 8])
  })

  // Contagem de atendimento não tem metade — é o `allowDecimals={false}`
  // da web.
  it('máximo menor que o número de marcas não cria fração', () => {
    expect(axisTicks(2, 4)).toEqual([0, 1, 2])
  })

  it('arredonda o passo para cima quando não divide certo', () => {
    expect(axisTicks(7, 4)).toEqual([0, 2, 4, 6])
  })
})

describe('visibleTickIndexes', () => {
  it('sem rótulo, não mostra nenhum', () => {
    expect(visibleTickIndexes(0, 6)).toEqual([])
  })

  it('cabendo todos, mostra todos', () => {
    expect(visibleTickIndexes(3, 6)).toEqual([0, 1, 2])
  })

  /**
   * Trinta dias não cabem em 390px. O primeiro e o último sempre entram —
   * são eles que dizem de quando até quando é o período.
   */
  it('rareia os rótulos e mantém as pontas', () => {
    const indexes = visibleTickIndexes(30, 6)

    expect(indexes[0]).toBe(0)
    expect(indexes[indexes.length - 1]).toBe(29)
    expect(indexes.length).toBeLessThanOrEqual(7)
  })

  it('não repete a última quando ela já é passo exato', () => {
    const indexes = visibleTickIndexes(7, 6)

    expect(indexes.filter((index) => index === 6)).toHaveLength(1)
  })
})

describe('defaultDateRange', () => {
  // Trinta dias contando hoje, como na web.
  it('vai de 29 dias atrás até hoje', () => {
    const { from, to } = defaultDateRange(new Date(2026, 9, 21))

    expect(toApiDate(from)).toBe('2026-09-22')
    expect(toApiDate(to)).toBe('2026-10-21')
  })

  it('atravessa a virada do ano', () => {
    expect(toApiDate(defaultDateRange(new Date(2026, 0, 5)).from)).toBe('2025-12-07')
  })

  it('não altera a data recebida', () => {
    const today = new Date(2026, 9, 21)

    defaultDateRange(today)

    expect(today.getDate()).toBe(21)
  })
})

describe('toApiDate', () => {
  it('formata com dois dígitos', () => {
    expect(toApiDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  /**
   * Nunca `toISOString`: às 21h de Brasília ele já devolve o dia
   * seguinte, e o dashboard abriria mostrando um período que termina
   * amanhã.
   */
  it('usa o dia local, não o UTC', () => {
    expect(toApiDate(new Date(2026, 9, 21, 23, 30))).toBe('2026-10-21')
  })
})
