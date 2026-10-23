import { DayOfWeek } from '@app/shared'
import {
  applyTimeMask,
  validateScheduleForm,
  type IScheduleFormValues,
} from './schedule-form.validation'

const valid: IScheduleFormValues = {
  professionalId: 'prof-1',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '17:00',
  slotDurationInMinutes: '30',
  validFrom: '',
  validUntil: '',
}

const form = (overrides: Partial<IScheduleFormValues> = {}) => ({ ...valid, ...overrides })

describe('applyTimeMask', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['08', '08'],
    ['080', '08:0'],
    ['0800', '08:00'],
  ])('"%s" vira "%s"', (input, expected) => {
    expect(applyTimeMask(input)).toBe(expected)
  })

  it('ignora o que não é dígito e para nos quatro', () => {
    expect(applyTimeMask('08:00')).toBe('08:00')
    expect(applyTimeMask('080012')).toBe('08:00')
  })
})

describe('validateScheduleForm', () => {
  it('o formulário preenchido não tem erro', () => {
    expect(validateScheduleForm(valid, true)).toEqual({})
  })

  it('o ADMIN precisa escolher o profissional', () => {
    expect(validateScheduleForm(form({ professionalId: '' }), true).professionalId).toBeDefined()
  })

  /**
   * O PROFESSIONAL cria só a própria agenda, e o servidor a deduz do
   * `userId` — pedir-lhe o profissional seria pedir um dado que ele não
   * escolhe.
   */
  it('o profissional não precisa escolher ninguém', () => {
    expect(validateScheduleForm(form({ professionalId: '' }), false)).toEqual({})
  })

  it.each([
    ['dia vazio', { dayOfWeek: '' }, 'dayOfWeek'],
    ['dia inválido', { dayOfWeek: 'FUNDAY' }, 'dayOfWeek'],
    ['início incompleto', { startTime: '08:' }, 'startTime'],
    ['hora impossível', { startTime: '25:00' }, 'startTime'],
    ['minuto impossível', { endTime: '17:99' }, 'endTime'],
  ])('recusa %s', (_caso, overrides, field) => {
    expect(validateScheduleForm(form(overrides), true)[field]).toBeDefined()
  })

  it('o fim tem de ser depois do início', () => {
    expect(validateScheduleForm(form({ startTime: '17:00', endTime: '08:00' }), true).endTime).toMatch(
      /após o início/,
    )
    expect(validateScheduleForm(form({ startTime: '08:00', endTime: '08:00' }), true).endTime).toBeDefined()
  })

  describe('duração', () => {
    it.each([
      ['vazia', '', /inválida/],
      ['não numérica', 'trinta', /inválida/],
      ['abaixo do mínimo', '10', /Mínimo 15/],
      ['acima do máximo', '180', /Máximo 120/],
    ])('recusa %s', (_caso, slotDurationInMinutes, expected) => {
      expect(
        validateScheduleForm(form({ slotDurationInMinutes }), true).slotDurationInMinutes,
      ).toMatch(expected)
    })

    /**
     * A sobra não é erro de digitação: 40 minutos é uma duração válida, só
     * não fecha numa janela de 9h. A mensagem vem do `@app/shared` e mostra
     * a conta, em vez de dizer que o valor é proibido.
     */
    it('avisa quando a duração não fecha a janela', () => {
      const message = validateScheduleForm(form({ slotDurationInMinutes: '40' }), true)
        .slotDurationInMinutes

      expect(message).toBeDefined()
      expect(message).not.toMatch(/Mínimo|Máximo|inválida/)
    })

    it('duração que fecha a janela passa', () => {
      expect(
        validateScheduleForm(form({ slotDurationInMinutes: '45' }), true).slotDurationInMinutes,
      ).toBeUndefined()
    })

    // Com horário inválido não há janela para conferir, e a mensagem da
    // sobra apareceria sob um campo que não é o do problema.
    it('horário inválido não produz aviso de sobra', () => {
      expect(
        validateScheduleForm(form({ startTime: '0', slotDurationInMinutes: '40' }), true)
          .slotDurationInMinutes,
      ).toBeUndefined()
    })
  })

  describe('validade', () => {
    it('sem datas, passa', () => {
      expect(validateScheduleForm(valid, true)).toEqual({})
    })

    it('com as duas datas em ordem, passa', () => {
      expect(
        validateScheduleForm(form({ validFrom: '01/01/2026', validUntil: '31/12/2026' }), true),
      ).toEqual({})
    })

    it.each([
      ['de', { validFrom: '31/02/2026' }, 'validFrom'],
      ['até', { validUntil: '31/02/2026' }, 'validUntil'],
    ])('recusa data %s inexistente', (_caso, overrides, field) => {
      expect(validateScheduleForm(form(overrides), true)[field]).toMatch(/inválida/)
    })

    it('a data final tem de ser depois da inicial', () => {
      expect(
        validateScheduleForm(form({ validFrom: '31/12/2026', validUntil: '01/01/2026' }), true)
          .validUntil,
      ).toMatch(/após a data inicial/)
    })

    it('as duas iguais também são recusadas', () => {
      expect(
        validateScheduleForm(form({ validFrom: '01/01/2026', validUntil: '01/01/2026' }), true)
          .validUntil,
      ).toBeDefined()
    })
  })
})
