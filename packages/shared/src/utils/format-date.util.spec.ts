import { formatDate } from './format-date.util'

describe('formatDate', () => {
  it('escreve a data no formato brasileiro', () => {
    expect(formatDate(new Date(2026, 3, 9))).toBe('09/04/2026')
  })

  // O backend manda `YYYY-MM-DD`; aceitar a string evita um `new Date` em
  // cada chamada.
  it('aceita a data como texto', () => {
    expect(formatDate('2026-04-09T12:00:00')).toBe('09/04/2026')
  })

  /**
   * O que prova `2-digit` é o locale estrangeiro, e não o nosso: em pt-BR o
   * ICU zera à esquerda mesmo com `numeric`, então um teste brasileiro de
   * "01/02" passaria com as duas opções e não garantiria nada. Em en-US a
   * diferença aparece — `numeric` daria "4/9/2026".
   */
  it('pede dois dígitos no dia e no mês, e não só o número', () => {
    expect(formatDate(new Date(2026, 3, 9), 'en-US')).toBe('04/09/2026')
  })
})
