import { withAlpha } from './color.util'

describe('withAlpha', () => {
  // Os mesmos percentuais que a web escreve como `bg-accent/10`, `/20`, `/40`.
  it.each([
    [10, '1A'],
    [20, '33'],
    [40, '66'],
    [100, 'FF'],
    [0, '00'],
  ])('%s%% vira %s', (percent, suffix) => {
    expect(withAlpha('#5B1027', percent)).toBe(`#5B1027${suffix}`)
  })

  it('prende valores fora da faixa em vez de gerar hexadecimal inválido', () => {
    expect(withAlpha('#5B1027', 200)).toBe('#5B1027FF')
    expect(withAlpha('#5B1027', -5)).toBe('#5B102700')
  })
})
