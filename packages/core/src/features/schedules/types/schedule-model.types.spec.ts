import { DayOfWeek } from '@app/shared'
import { DAY_OF_WEEK_LABELS } from './schedule-model.types'

/**
 * O mapa é o que a agenda escreve na tela.
 *
 * O teste não confere a tradução de cada dia — confere que **todo** valor do
 * enum tem rótulo. Acrescentar um dia no `@app/shared` sem acrescentar aqui
 * não quebra a compilação (`Record` com enum reclama, mas um `as` em qualquer
 * ponto da cadeia cala), e a agenda passaria a exibir `undefined` num dia da
 * semana.
 */
describe('DAY_OF_WEEK_LABELS', () => {
  it('has a label for every day of the week', () => {
    const days = Object.values(DayOfWeek)

    expect(Object.keys(DAY_OF_WEEK_LABELS)).toHaveLength(days.length)
    days.forEach((day) => {
      expect(DAY_OF_WEEK_LABELS[day]).toEqual(expect.any(String))
      expect(DAY_OF_WEEK_LABELS[day].length).toBeGreaterThan(0)
    })
  })

  it('labels the week in Portuguese, starting on Monday', () => {
    expect(DAY_OF_WEEK_LABELS[DayOfWeek.MONDAY]).toBe('Segunda-feira')
    expect(DAY_OF_WEEK_LABELS[DayOfWeek.SUNDAY]).toBe('Domingo')
  })
})
