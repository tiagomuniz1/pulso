import { VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import type { IPatientVaccineStatusItem } from '@app/core'
import {
  countPending,
  doseSummary,
  formatIsoDate,
  pendingSummary,
  readableAge,
  sortByUrgency,
  VACCINE_STATUS_LABELS,
  VACCINE_STATUS_TONES,
} from './vaccine-status.util'

const item = (overrides: Partial<IPatientVaccineStatusItem> = {}): IPatientVaccineStatusItem => ({
  vaccineId: 'v1',
  vaccineName: 'Tríplice viral',
  vaccineAbbreviation: 'SCR',
  status: VaccineScheduleStatus.PENDENTE,
  nextDoseLabel: null,
  nextDoseDueFrom: null,
  dosesTaken: 0,
  dosesExpected: 2,
  decision: null,
  decisionReason: null,
  decidedByProfessionalName: null,
  ...overrides,
})

/**
 * **O sistema informa, não prescreve.** "Pendente pelo calendário", nunca
 * "em atraso" — a palavra final é de quem atende.
 */
describe('VACCINE_STATUS_LABELS', () => {
  it('não usa linguagem de ordem', () => {
    expect(VACCINE_STATUS_LABELS[VaccineScheduleStatus.PENDENTE]).toBe(
      'Pendente pelo calendário',
    )
    expect(VACCINE_STATUS_LABELS[VaccineScheduleStatus.ATRASADA]).toBe(
      'Fora da janela do calendário',
    )
  })

  it('tem rótulo e tom para todo status', () => {
    Object.values(VaccineScheduleStatus).forEach((status) => {
      expect(VACCINE_STATUS_LABELS[status]).toBeTruthy()
      expect(VACCINE_STATUS_TONES[status]).toBeTruthy()
    })
  })
})

describe('sortByUrgency', () => {
  // A ordem responde "o que preciso olhar agora".
  it('põe o que saiu da janela na frente e o que não se aplica no fim', () => {
    const sorted = sortByUrgency([
      item({ vaccineId: 'd', status: VaccineScheduleStatus.NAO_SE_APLICA }),
      item({ vaccineId: 'c', status: VaccineScheduleStatus.EM_DIA }),
      item({ vaccineId: 'b', status: VaccineScheduleStatus.PENDENTE }),
      item({ vaccineId: 'a', status: VaccineScheduleStatus.ATRASADA }),
    ])

    expect(sorted.map((entry) => entry.vaccineId)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('não mexe na lista recebida', () => {
    const items = [
      item({ vaccineId: 'a', status: VaccineScheduleStatus.EM_DIA }),
      item({ vaccineId: 'b', status: VaccineScheduleStatus.ATRASADA }),
    ]

    sortByUrgency(items)

    expect(items[0].vaccineId).toBe('a')
  })
})

describe('countPending', () => {
  it('conta pendente e fora da janela', () => {
    expect(
      countPending([
        item({ status: VaccineScheduleStatus.PENDENTE }),
        item({ status: VaccineScheduleStatus.ATRASADA }),
        item({ status: VaccineScheduleStatus.EM_DIA }),
        item({ status: VaccineScheduleStatus.FUTURA }),
      ]),
    ).toBe(2)
  })

  /**
   * Regra com recorte de sexo **não existe** para quem está fora dele: é
   * ausência de dever, não pendência — contá-la cobraria da paciente uma
   * vacina que o calendário não lhe pede.
   */
  it('não conta o que não se aplica', () => {
    expect(countPending([item({ status: VaccineScheduleStatus.NAO_SE_APLICA })])).toBe(0)
  })
})

describe('readableAge', () => {
  it.each([
    [1, '1 mês'],
    [7, '7 meses'],
    [23, '23 meses'],
  ])('%s meses vira "%s"', (months, expected) => {
    expect(readableAge(months)).toBe(expected)
  })

  // Até dois anos a mãe responde em meses; daí em diante, em anos.
  it.each([
    [24, '2 anos'],
    [35, '2 anos'],
    [12 * 40, '40 anos'],
  ])('%s meses vira "%s"', (months, expected) => {
    expect(readableAge(months)).toBe(expected)
  })

  it('doze meses ainda são meses', () => {
    expect(readableAge(12)).toBe('12 meses')
  })
})

describe('pendingSummary', () => {
  it('sem pendência, diz que não há', () => {
    expect(pendingSummary(30, 0)).toBe('2 anos · nada pendente pelo calendário')
  })

  it('uma pendência é singular', () => {
    expect(pendingSummary(6, 1)).toBe('6 meses · 1 vacina pendente pelo calendário')
  })

  it('mais de uma é plural', () => {
    expect(pendingSummary(6, 3)).toBe('6 meses · 3 vacinas pendentes pelo calendário')
  })
})

describe('formatIsoDate', () => {
  /**
   * Sem passar por `Date`: `new Date('2026-04-12')` é meia-noite em UTC,
   * que no Brasil ainda é dia 11 — a data devida apareceria um dia antes.
   */
  it('inverte os pedaços sem tocar em fuso', () => {
    expect(formatIsoDate('2026-04-12')).toBe('12/04/2026')
  })
})

describe('doseSummary', () => {
  it('conta as doses tomadas', () => {
    expect(doseSummary(item({ dosesTaken: 1, dosesExpected: 2 }))).toBe('1 de 2 dose(s)')
  })

  it('acrescenta a próxima dose quando há', () => {
    expect(doseSummary(item({ nextDoseLabel: '2ª dose' }))).toMatch(/próxima: 2ª dose/)
  })

  it('acrescenta desde quando ela é devida', () => {
    expect(
      doseSummary(item({ nextDoseLabel: '2ª dose', nextDoseDueFrom: '2026-04-12' })),
    ).toMatch(/a partir de 12\/04\/2026/)
  })

  it('sem próxima dose, não deixa separador solto', () => {
    expect(doseSummary(item({ dosesTaken: 2, dosesExpected: 2 }))).toBe('2 de 2 dose(s)')
  })
})

describe('VaccineDecision', () => {
  // Guarda contra o enum mudar sem a tela acompanhar.
  it('as três condutas continuam existindo', () => {
    expect(Object.values(VaccineDecision)).toEqual(
      expect.arrayContaining([
        VaccineDecision.CONFIRMADA,
        VaccineDecision.ADIADA,
        VaccineDecision.DISPENSADA,
      ]),
    )
  })
})
