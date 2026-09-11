import { describeSlotMismatch, duracoesQueCabem, timeToMinutes } from './slot-fit.util'

describe('timeToMinutes', () => {
  it('converts HH:MM to minutes', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  // O campo é mascarado e validado por regex antes de chegar aqui; isto é só a
  // rede de segurança para não devolver NaN e contaminar a conta toda.
  it('treats a missing part as zero instead of returning NaN', () => {
    expect(timeToMinutes('08')).toBe(480)
  })
})

describe('duracoesQueCabem', () => {
  it('lists the durations between 15 and 120 that close the window exactly', () => {
    expect(duracoesQueCabem(60)).toEqual([15, 20, 30, 60])
  })

  it('returns nothing when no duration in range divides the window', () => {
    // 121 é primo: só 1 e 121 dividem, e nenhum cabe na faixa.
    expect(duracoesQueCabem(121)).toEqual([])
  })
})

describe('describeSlotMismatch', () => {
  it('returns null when the duration closes the window', () => {
    expect(describeSlotMismatch('08:00', '12:00', 40)).toBeNull()
  })

  it('returns null for a window with no duration, instead of dividing by zero', () => {
    expect(describeSlotMismatch('08:00', '08:00', 40)).toBeNull()
    expect(describeSlotMismatch('12:00', '08:00', 40)).toBeNull()
    expect(describeSlotMismatch('08:00', '12:00', 0)).toBeNull()
  })

  // O caso que motivou tudo: 40 minutos numa janela de 9h. A mensagem anterior
  // dizia só "deve ser divisível" e ficava sob o campo da duração, fazendo
  // parecer que 40 era um valor proibido.
  it('shows the arithmetic and both ways out', () => {
    const mensagem = describeSlotMismatch('09:00', '18:00', 40)

    expect(mensagem).toContain('das 09:00 às 18:00')
    expect(mensagem).toContain('9h')
    expect(mensagem).toContain('blocos de 40 min')
    expect(mensagem).toContain('sobrariam 20 min')
    expect(mensagem).toContain('use 20, 30 ou 45 min')
    expect(mensagem).toContain('termine às 18:20 para manter 40 min')
  })

  it('formats a window with leftover minutes as hours and minutes', () => {
    expect(describeSlotMismatch('08:00', '11:30', 40)).toContain('3h30')
  })

  it('formats a sub-hour window in minutes', () => {
    expect(describeSlotMismatch('08:00', '08:50', 40)).toContain('50 min')
  })

  // Sugerir 36 ou 48 minutos é correto e inútil — ninguém marca consulta assim.
  it('prefers the durations a clinic actually uses', () => {
    const mensagem = describeSlotMismatch('09:00', '18:00', 40)!

    expect(mensagem).not.toContain('36')
    expect(mensagem).not.toContain('27')
  })

  it('falls back to unusual durations when no common one fits', () => {
    // 50 min: entre as usuais, nenhuma divide. 25 divide.
    expect(describeSlotMismatch('23:00', '23:50', 40)).toContain('use 25 ou 50 min')
  })

  it('does not suggest an end time past midnight', () => {
    const mensagem = describeSlotMismatch('23:00', '23:50', 40)!

    expect(mensagem).not.toContain('termine às')
  })

  it('names a single alternative without a list', () => {
    // Janela de 20 min: 20 é a única duração da faixa que a divide.
    expect(describeSlotMismatch('08:00', '08:20', 15)).toContain('use 20 min')
  })

  it('asks for a different window when there is no way out at all', () => {
    // 121 min é primo e o fim ajustado passaria da meia-noite.
    const mensagem = describeSlotMismatch('21:58', '23:59', 40)!

    expect(mensagem).toContain('Ajuste o horário de início ou de fim.')
    expect(mensagem).not.toContain('use ')
  })
})
