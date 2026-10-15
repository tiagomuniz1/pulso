import { MedicalRecordFieldType } from '@app/shared'
import { formatFieldValue } from './format-field-value.util'

// Os mesmos casos do irmão no backend
// (`modules/medical-records/utils/format-record-field-value.util.spec.ts`).
// Se um dos dois mudar sem o outro, o PDF passa a discordar da tela.
const field = (type: MedicalRecordFieldType, options: { value: string; label: string }[] | null = null) =>
  ({ type, options }) as Parameters<typeof formatFieldValue>[0]

const DIAGNOSTICO = [
  { value: 'hipertensao_grau_2', label: 'Hipertensão grau 2' },
  { value: 'diabetes_tipo_2', label: 'Diabetes tipo 2' },
]

describe('formatFieldValue', () => {
  it.each([null, undefined, ''])('renders %p as a dash', (value) => {
    expect(formatFieldValue(field(MedicalRecordFieldType.TEXT), value)).toBe('—')
  })

  it('renders booleans in Portuguese', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.BOOLEAN), true)).toBe('Sim')
    expect(formatFieldValue(field(MedicalRecordFieldType.BOOLEAN), false)).toBe('Não')
  })

  it('renders dates as dd/mm/yyyy', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.DATE), '2026-09-04')).toBe('04/09/2026')
  })

  it('falls back to the raw value when a date is not ISO', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.DATE), '04/09/2026')).toBe('04/09/2026')
  })

  // A tela principal do prontuário mostrava o value cru até aqui, enquanto o
  // histórico mostrava o rótulo — a mesma paciente lida de dois jeitos.
  it('resolves the option label of a select', () => {
    expect(
      formatFieldValue(field(MedicalRecordFieldType.SELECT, DIAGNOSTICO), 'hipertensao_grau_2'),
    ).toBe('Hipertensão grau 2')
  })

  it('resolves every option label of a multiselect', () => {
    expect(
      formatFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), [
        'hipertensao_grau_2',
        'diabetes_tipo_2',
      ]),
    ).toBe('Hipertensão grau 2, Diabetes tipo 2')
  })

  it('falls back to the raw value when the option no longer exists', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.SELECT, DIAGNOSTICO), 'asma')).toBe('asma')
  })

  it('renders an empty multiselect as a dash', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), [])).toBe('—')
  })

  it('renders a multiselect that arrived as a single value', () => {
    expect(
      formatFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), 'diabetes_tipo_2'),
    ).toBe('Diabetes tipo 2')
  })

  it('renders numbers and text as they are', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.NUMBER), 72.5)).toBe('72.5')
    expect(formatFieldValue(field(MedicalRecordFieldType.TEXTAREA), 'Refere dor')).toBe('Refere dor')
  })

  it('does not treat zero as empty', () => {
    expect(formatFieldValue(field(MedicalRecordFieldType.NUMBER), 0)).toBe('0')
  })
})
