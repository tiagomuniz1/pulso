import { applyDateMask, fromIsoDate, isFutureDate, toIsoDate } from './date-input'

describe('applyDateMask', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['15', '15'],
    ['1505', '15/05'],
    ['15051990', '15/05/1990'],
  ])('"%s" vira "%s"', (input, expected) => {
    expect(applyDateMask(input)).toBe(expected)
  })

  it('ignora o que não é dígito', () => {
    expect(applyDateMask('15/05/1990')).toBe('15/05/1990')
    expect(applyDateMask('15a05b1990')).toBe('15/05/1990')
  })

  // Sem o corte, digitar o nono dígito empurraria o ano para cinco casas e o
  // campo aceitaria "15/05/19900".
  it('para nos oito dígitos', () => {
    expect(applyDateMask('150519901')).toBe('15/05/1990')
  })
})

describe('toIsoDate', () => {
  it('converte para o formato da API', () => {
    expect(toIsoDate('15/05/1990')).toBe('1990-05-15')
  })

  it('aceita espaços nas pontas', () => {
    expect(toIsoDate('  15/05/1990  ')).toBe('1990-05-15')
  })

  it.each([
    ['incompleta', '15/05'],
    ['vazia', ''],
    ['com letra', '15/ab/1990'],
    ['ano curto', '15/05/90'],
  ])('%s vira null', (_caso, input) => {
    expect(toIsoDate(input)).toBeNull()
  })

  /**
   * O caso que uma regex não pega: `new Date('2026-02-31')` não falha — ela
   * rola para 03/03. Sem a comparação de volta, o cadastro gravaria uma data
   * que a pessoa não digitou.
   */
  it.each([
    ['31 de fevereiro', '31/02/2026'],
    ['31 de abril', '31/04/2026'],
    ['29 de fevereiro fora do bissexto', '29/02/2026'],
    ['mês 13', '15/13/1990'],
    ['dia zero', '00/05/1990'],
  ])('%s vira null', (_caso, input) => {
    expect(toIsoDate(input)).toBeNull()
  })

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(toIsoDate('29/02/2024')).toBe('2024-02-29')
  })
})

describe('fromIsoDate', () => {
  it('abre o formulário de edição preenchido', () => {
    expect(fromIsoDate(new Date(1990, 4, 15))).toBe('15/05/1990')
  })

  // Sem o `padStart`, 05/01 sairia como "5/1/2026" e a máscara não o
  // reconheceria de volta.
  it('zera à esquerda', () => {
    expect(fromIsoDate(new Date(2026, 0, 5))).toBe('05/01/2026')
  })
})

describe('isFutureDate', () => {
  it('ontem não é futuro', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isFutureDate(yesterday.toISOString().slice(0, 10))).toBe(false)
  })

  // Hoje não é futuro: quem nasceu hoje é recém-nascido, e o cadastro de
  // dependente sem CPF existe justamente para ele.
  it('hoje não é futuro', () => {
    expect(isFutureDate(new Date().toISOString().slice(0, 10))).toBe(false)
  })

  it('amanhã é futuro', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isFutureDate(tomorrow.toISOString().slice(0, 10))).toBe(true)
  })
})
