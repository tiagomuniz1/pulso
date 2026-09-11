import { MedicalRecordFieldType } from '@app/shared'
import { formatRecordFieldValue } from '../utils/format-record-field-value.util'

const field = (type: MedicalRecordFieldType, options: { value: string; label: string }[] | null = null) =>
  ({ type, options }) as Parameters<typeof formatRecordFieldValue>[0]

const DIAGNOSTICO = [
  { value: 'hipertensao_grau_2', label: 'Hipertensão grau 2' },
  { value: 'diabetes_tipo_2', label: 'Diabetes tipo 2' },
]

describe('formatRecordFieldValue', () => {
  // Um prontuário é também o registro do que não foi preenchido. A linha fica,
  // com o travessão — some seria esconder de quem lê.
  it.each([null, undefined, ''])('renders %p as a dash', (value) => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.TEXT), value)).toBe('—')
  })

  it('renders booleans in Portuguese', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.BOOLEAN), true)).toBe('Sim')
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.BOOLEAN), false)).toBe('Não')
  })

  it('renders dates as dd/mm/yyyy', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.DATE), '2026-09-04')).toBe('04/09/2026')
  })

  // Nunca deixar a data virar `Invalid Date` nem lançar: o documento sai com o
  // que estiver gravado, e o dado torto fica visível para quem for corrigir.
  it('falls back to the raw value when a date is not ISO', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.DATE), '04/09/2026')).toBe('04/09/2026')
  })

  // O `data` guarda o `value` da opção. Sem resolver, o documento diria
  // `hipertensao_grau_2` onde a profissional escolheu "Hipertensão grau 2".
  it('resolves the option label of a select', () => {
    expect(
      formatRecordFieldValue(field(MedicalRecordFieldType.SELECT, DIAGNOSTICO), 'hipertensao_grau_2'),
    ).toBe('Hipertensão grau 2')
  })

  it('resolves every option label of a multiselect', () => {
    expect(
      formatRecordFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), [
        'hipertensao_grau_2',
        'diabetes_tipo_2',
      ]),
    ).toBe('Hipertensão grau 2, Diabetes tipo 2')
  })

  // A opção pode ter saído do modelo depois de o prontuário ser escrito — o
  // valor congelado continua sendo o que a pessoa registrou.
  it('falls back to the raw value when the option no longer exists', () => {
    expect(
      formatRecordFieldValue(field(MedicalRecordFieldType.SELECT, DIAGNOSTICO), 'asma'),
    ).toBe('asma')
  })

  it('renders an empty multiselect as a dash', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), [])).toBe('—')
  })

  it('renders a multiselect that arrived as a single value', () => {
    expect(
      formatRecordFieldValue(field(MedicalRecordFieldType.MULTISELECT, DIAGNOSTICO), 'diabetes_tipo_2'),
    ).toBe('Diabetes tipo 2')
  })

  it('renders numbers and text as they are', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.NUMBER), 72.5)).toBe('72.5')
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.TEXTAREA), 'Refere dor')).toBe('Refere dor')
  })

  // Zero é um valor: peso 0 não existe, mas escala de dor 0 sim.
  it('does not treat zero as empty', () => {
    expect(formatRecordFieldValue(field(MedicalRecordFieldType.NUMBER), 0)).toBe('0')
  })
})
