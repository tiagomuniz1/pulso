import { MedicalRecordFieldType } from '@app/shared'
import { IClinicRecordBlock, IClinicRecordRow } from './iclinic-csv.parser'
import {
  blockToValue,
  formatBodyMass,
  mapMedicalRecord,
  resolvePrimaryTab,
  toIsoDate,
} from './map-medical-record'

const GYN = 'ATENDIMENTO GINECOLOGICO'
const FIRST_PRENATAL = 'ATENDIMENTO 1 PRÉ-NATAL'
const PRENATAL = 'ATENDIMENTO CONSULTAS PRÉ-NATAL'

function block(overrides: Partial<IClinicRecordBlock> = {}): IClinicRecordBlock {
  return { name: 'Conduta', kind: 'lt', tab: GYN, value: '<p>Solicito exames</p>', date_added: '2025-06-11T08:00:00+00:00', ...overrides }
}

function row(blocks: IClinicRecordBlock[], overrides: Partial<IClinicRecordRow> = {}): IClinicRecordRow {
  return {
    pk: '481322830',
    patient_id: '549928',
    date: '2025-06-11',
    start_time: '08:00:00',
    end_time: '08:40:00',
    procedures: [{ name: 'Consulta Ginecológica' }],
    blocks,
    ...overrides,
  }
}

describe('toIsoDate', () => {
  it('converts the Brazilian format the export uses', () => {
    expect(toIsoDate('11/06/2025')).toBe('2025-06-11')
  })

  it('returns null for anything else', () => {
    expect(toIsoDate('2025-06-11')).toBeNull()
    expect(toIsoDate('')).toBeNull()
  })
})

describe('formatBodyMass', () => {
  it('renders one measurement per line', () => {
    const value = [
      { bmi_value: '31.6776', height: 164.0, weight: 85.2 },
      { bmi_value: '27.8921', height: 164.0, weight: 75.0 },
    ]
    expect(formatBodyMass(value)).toBe(
      'Peso 85,2 kg · Altura 164 cm · IMC 31,68\nPeso 75 kg · Altura 164 cm · IMC 27,89',
    )
  })

  it('skips missing parts instead of printing undefined', () => {
    expect(formatBodyMass([{ weight: 70 }])).toBe('Peso 70 kg')
  })

  it('returns an empty string for a non-list', () => {
    expect(formatBodyMass(null)).toBe('')
    expect(formatBodyMass([])).toBe('')
  })
})

describe('blockToValue', () => {
  it('converts rich text to plain text', () => {
    expect(blockToValue(block({ kind: 'lt', value: '<p><strong>Oi</strong></p>' }), MedicalRecordFieldType.TEXTAREA)).toBe(
      'Oi',
    )
  })

  it('passes short text through', () => {
    expect(blockToValue(block({ kind: 'st', value: 'OK - há 3 meses' }), MedicalRecordFieldType.TEXT)).toBe(
      'OK - há 3 meses',
    )
  })

  it('converts a date field to ISO', () => {
    expect(blockToValue(block({ kind: 'da', value: '11/06/2025' }), MedicalRecordFieldType.DATE)).toBe('2025-06-11')
  })

  it('keeps the raw date when the field is not a date', () => {
    expect(blockToValue(block({ kind: 'da', value: '11/06/2025' }), MedicalRecordFieldType.TEXT)).toBe('11/06/2025')
  })

  it('joins the CID list with line breaks', () => {
    const value = ['Z34 - Supervisão de gravidez normal', 'Z35 - Supervisão de gravidez de alto risco']
    expect(blockToValue(block({ kind: 'db', value }), MedicalRecordFieldType.TEXTAREA)).toBe(
      'Z34 - Supervisão de gravidez normal\nZ35 - Supervisão de gravidez de alto risco',
    )
  })

  it('renders the BMI block as text', () => {
    expect(
      blockToValue(block({ kind: 'bm', value: [{ weight: 85.2, height: 164, bmi_value: '31.6776' }] }), MedicalRecordFieldType.TEXTAREA),
    ).toBe('Peso 85,2 kg · Altura 164 cm · IMC 31,68')
  })

  it('turns a null value into an empty string', () => {
    expect(blockToValue(block({ kind: 'st', value: null }), MedicalRecordFieldType.TEXT)).toBe('')
  })
})

describe('resolvePrimaryTab', () => {
  it('returns null when there is no block', () => {
    expect(resolvePrimaryTab([])).toBeNull()
  })

  it('picks the tab with the most blocks', () => {
    const blocks = [
      block({ tab: GYN }),
      block({ tab: GYN, name: 'Alergia' }),
      block({ tab: FIRST_PRENATAL, name: 'Alergias', kind: 'st', value: 'Nega' }),
    ]
    expect(resolvePrimaryTab(blocks)).toBe(GYN)
  })
})

describe('mapMedicalRecord', () => {
  it('maps each block to its field key', () => {
    const mapped = mapMedicalRecord(
      row([
        block({ tab: GYN, name: 'Conduta', value: '<p>Solicito exames</p>' }),
        block({ tab: GYN, name: 'Exame Físico', value: '<p>BEG, LOTE</p>' }),
      ]),
    )!

    expect(mapped.templateName).toBe('Atendimento Ginecológico')
    expect(mapped.data).toEqual({ conduta: 'Solicito exames', exame_fisico: 'BEG, LOTE' })
    expect(mapped.notes).toBeNull()
  })

  it('ignores a block whose label is not in the template', () => {
    const mapped = mapMedicalRecord(row([block({ tab: GYN, name: 'Campo Inexistente', value: '<p>x</p>' })]))!
    expect(mapped.data).toEqual({})
  })

  it('drops empty values instead of writing empty strings', () => {
    const mapped = mapMedicalRecord(row([block({ tab: GYN, name: 'Conduta', value: '' })]))!
    expect(mapped.data).toEqual({})
  })

  it('concatenates a field filled twice during the same consultation', () => {
    const mapped = mapMedicalRecord(
      row([
        block({ tab: GYN, name: 'Conduta', value: '<p>Primeiro</p>', date_added: '2025-06-11T08:00:00+00:00' }),
        block({ tab: GYN, name: 'Conduta', value: '<p>Segundo</p>', date_added: '2025-06-11T09:00:00+00:00' }),
      ]),
    )!

    expect(mapped.data.conduta).toBe('Primeiro\n\nSegundo')
  })

  it('keeps only the last value for a date field', () => {
    const mapped = mapMedicalRecord(
      row([
        block({ tab: PRENATAL, name: 'DATA', kind: 'da', value: '10/06/2025', date_added: '2025-06-11T08:00:00+00:00' }),
        block({ tab: PRENATAL, name: 'DATA', kind: 'da', value: '11/06/2025', date_added: '2025-06-11T09:00:00+00:00' }),
      ]),
    )!

    expect(mapped.data.data).toBe('2025-06-11')
  })

  it('sends a second form to notes so the record stays editable', () => {
    const mapped = mapMedicalRecord(
      row([
        block({ tab: GYN, name: 'Conduta', value: '<p>Principal</p>' }),
        block({ tab: GYN, name: 'Alergia', value: '<p>Nega</p>' }),
        block({ tab: FIRST_PRENATAL, name: 'Carteira de Vacinação', value: '<p>Em dia</p>' }),
      ]),
    )!

    expect(mapped.tab).toBe(GYN)
    expect(mapped.data).toEqual({ conduta: 'Principal', alergia: 'Nega' })
    expect(mapped.notes).toContain('ATENDIMENTO 1 PRÉ-NATAL')
    expect(mapped.notes).toContain('Em dia')
  })

  it('still produces a record when the IClinic had no block at all', () => {
    const mapped = mapMedicalRecord(row([]))!

    expect(mapped.data).toEqual({})
    expect(mapped.notes).toBeNull()
    expect(mapped.externalId).toBe('481322830')
  })
})
