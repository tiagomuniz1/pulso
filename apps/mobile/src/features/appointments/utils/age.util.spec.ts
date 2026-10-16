import { ageFrom } from './age.util'

describe('ageFrom', () => {
  const today = new Date(2026, 9, 14) // 14 de outubro de 2026

  it.each([
    [new Date(1990, 4, 15), 36],
    [new Date(2000, 9, 14), 26],
    [new Date(2026, 9, 14), 0],
  ])('nascida em %s tem %s anos', (birthDate, expected) => {
    expect(ageFrom(birthDate, today)).toBe(expected)
  })

  // Aniversário que ainda não chegou neste ano não conta.
  it('não conta o aniversário de amanhã', () => {
    expect(ageFrom(new Date(1996, 9, 15), today)).toBe(29)
  })

  it('não conta o aniversário do mês que vem', () => {
    expect(ageFrom(new Date(1996, 10, 1), today)).toBe(29)
  })

  it('conta o aniversário de ontem', () => {
    expect(ageFrom(new Date(1996, 9, 13), today)).toBe(30)
  })

  it('usa hoje quando nenhuma data é dada', () => {
    const thisYear = new Date().getFullYear()

    expect(ageFrom(new Date(thisYear - 20, 0, 1))).toBeGreaterThanOrEqual(19)
  })
})
