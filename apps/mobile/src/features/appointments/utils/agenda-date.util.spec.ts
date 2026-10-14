import {
  addDays,
  formatAgendaDate,
  formatToolbarDate,
  formatShortDate,
  formatTime,
  isToday,
  toIsoDate,
  todayIsoDate,
} from './agenda-date.util'

describe('agenda-date', () => {
  describe('toIsoDate', () => {
    it('formats from the local components', () => {
      expect(toIsoDate(new Date(2026, 2, 10, 15, 30))).toBe('2026-03-10')
    })

    it('pads month and day', () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    })

    /**
     * O bug que esta função existe para impedir.
     *
     * 22h do dia 10, no fuso de Brasília, é 01h do dia 11 em UTC. Um
     * `toISOString().slice(0, 10)` abriria a agenda no dia seguinte enquanto o
     * consultório ainda atende hoje — e é o que acontecia no backend.
     */
    it('keeps the local day at night, when UTC has already rolled over', () => {
      const lateEvening = new Date(2026, 2, 10, 22, 0)

      expect(toIsoDate(lateEvening)).toBe('2026-03-10')
      expect(toIsoDate(lateEvening)).not.toBe(lateEvening.toISOString().slice(0, 10))
    })
  })

  describe('addDays', () => {
    it.each([
      ['2026-03-10', 1, '2026-03-11'],
      ['2026-03-10', -1, '2026-03-09'],
      ['2026-03-31', 1, '2026-04-01'],
      ['2026-01-01', -1, '2025-12-31'],
      ['2028-02-28', 1, '2028-02-29'],
    ])('%s + %s = %s', (from, days, expected) => {
      expect(addDays(from, days)).toBe(expected)
    })

    // `new Date('2026-03-10')` é meia-noite UTC, que em UTC-3 é o dia 9.
    it('does not slip a day by parsing the string as UTC', () => {
      expect(addDays('2026-03-10', 0)).toBe('2026-03-10')
    })
  })

  it('formatAgendaDate writes the weekday and the month in full', () => {
    expect(formatAgendaDate('2026-03-10')).toBe('terça, 10 de março')
    expect(formatAgendaDate('2026-01-01')).toBe('quinta, 1 de janeiro')
  })

  it('formatShortDate writes day/month/year', () => {
    expect(formatShortDate('2026-03-10')).toBe('10/03/2026')
  })

  it('formatTime drops the seconds', () => {
    expect(formatTime('09:30:00')).toBe('09:30')
    expect(formatTime('09:30')).toBe('09:30')
  })

  describe('isToday', () => {
    it('is true for today', () => {
      expect(isToday(todayIsoDate())).toBe(true)
    })

    it('is false for any other day', () => {
      expect(isToday(addDays(todayIsoDate(), 1))).toBe(false)
    })
  })

  // O formato da barra da web: "13 de out. de 2026". Abreviado à mão porque o
  // Hermes nem sempre embarca os dados de locale, e um mês em inglês no meio
  // da agenda é pior do que uma tabela de doze strings.
  it.each([
    ['2026-10-13', '13 de out. de 2026'],
    ['2026-01-01', '1 de jan. de 2026'],
    ['2026-12-31', '31 de dez. de 2026'],
  ])('formatToolbarDate(%s) = %s', (iso, expected) => {
    expect(formatToolbarDate(iso)).toBe(expected)
  })
})
