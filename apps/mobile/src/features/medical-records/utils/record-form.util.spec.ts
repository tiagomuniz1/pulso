import { MedicalRecordFieldType } from '@app/shared'
import type { IRecordFieldModel } from '@app/core'
import {
  buildInitialValues,
  fieldsOfSection,
  findMissingRequired,
  toRecordData,
} from './record-form.util'

const field = (overrides: Partial<IRecordFieldModel>): IRecordFieldModel => ({
  key: 'queixa',
  label: 'Queixa principal',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  sectionKey: null,
  ...overrides,
})

describe('buildInitialValues', () => {
  it('starts every field empty when there is no saved record', () => {
    const schema = [field({}), field({ key: 'peso', type: MedicalRecordFieldType.NUMBER })]

    expect(buildInitialValues(schema, null)).toEqual({ queixa: '', peso: '' })
  })

  it('brings the saved values back as strings', () => {
    const schema = [field({}), field({ key: 'peso', type: MedicalRecordFieldType.NUMBER })]

    expect(buildInitialValues(schema, { queixa: 'Dor', peso: 68.5 })).toEqual({
      queixa: 'Dor',
      peso: '68.5',
    })
  })

  // `!stored` apagaria da tela um "não" que a profissional marcou.
  it('keeps a saved false, which is an answer and not an absence', () => {
    const schema = [field({ key: 'fumante', type: MedicalRecordFieldType.BOOLEAN })]

    expect(buildInitialValues(schema, { fumante: false })).toEqual({ fumante: 'false' })
  })

  it('starts multiselect as a list, never as a string', () => {
    const schema = [field({ key: 'alergias', type: MedicalRecordFieldType.MULTISELECT })]

    expect(buildInitialValues(schema, null)).toEqual({ alergias: [] })
    expect(buildInitialValues(schema, { alergias: ['dipirona'] })).toEqual({
      alergias: ['dipirona'],
    })
  })

  it('recovers from a multiselect saved as something else', () => {
    const schema = [field({ key: 'alergias', type: MedicalRecordFieldType.MULTISELECT })]

    expect(buildInitialValues(schema, { alergias: 'dipirona' })).toEqual({ alergias: [] })
  })
})

describe('findMissingRequired', () => {
  it('is empty when every required field is filled', () => {
    const schema = [field({ required: true })]

    expect(findMissingRequired(schema, { queixa: 'Dor' })).toEqual([])
  })

  it('reports the blank required fields in schema order', () => {
    const schema = [
      field({ key: 'a', label: 'A', required: true, order: 1 }),
      field({ key: 'b', label: 'B', required: false, order: 2 }),
      field({ key: 'c', label: 'C', required: true, order: 3 }),
    ]

    const missing = findMissingRequired(schema, { a: '', b: '', c: '' })

    expect(missing.map((f) => f.key)).toEqual(['a', 'c'])
  })

  it('treats an empty multiselect as blank', () => {
    const schema = [
      field({ key: 'alergias', type: MedicalRecordFieldType.MULTISELECT, required: true }),
    ]

    expect(findMissingRequired(schema, { alergias: [] })).toHaveLength(1)
    expect(findMissingRequired(schema, { alergias: ['dipirona'] })).toHaveLength(0)
  })
})

describe('toRecordData', () => {
  it('converts each field to its own type', () => {
    const schema = [
      field({ key: 'queixa' }),
      field({ key: 'peso', type: MedicalRecordFieldType.NUMBER }),
      field({ key: 'fumante', type: MedicalRecordFieldType.BOOLEAN }),
      field({ key: 'alergias', type: MedicalRecordFieldType.MULTISELECT }),
    ]

    expect(
      toRecordData(schema, {
        queixa: 'Dor de cabeça',
        peso: '68.5',
        fumante: 'false',
        alergias: ['dipirona'],
      }),
    ).toEqual({
      queixa: 'Dor de cabeça',
      peso: 68.5,
      fumante: false,
      alergias: ['dipirona'],
    })
  })

  // Um campo em branco é ausência; gravá-lo como "" encheria o prontuário de
  // respostas vazias que o PDF depois imprimiria como se fossem conteúdo.
  it('leaves blank fields out instead of sending empty strings', () => {
    const schema = [field({ key: 'queixa' }), field({ key: 'obs' })]

    expect(toRecordData(schema, { queixa: 'Dor', obs: '' })).toEqual({ queixa: 'Dor' })
  })

  it('sends an empty multiselect as an empty list, which is an answer', () => {
    const schema = [field({ key: 'alergias', type: MedicalRecordFieldType.MULTISELECT })]

    expect(toRecordData(schema, { alergias: [] })).toEqual({ alergias: [] })
  })
})

describe('fieldsOfSection', () => {
  const schema = [
    field({ key: 'c', order: 3, sectionKey: 'anamnese' }),
    field({ key: 'a', order: 1, sectionKey: 'anamnese' }),
    field({ key: 'solto', order: 2, sectionKey: null }),
  ]

  it('returns a section ordered by the field order, not the array order', () => {
    expect(fieldsOfSection(schema, 'anamnese').map((f) => f.key)).toEqual(['a', 'c'])
  })

  it('returns the loose fields for a null section', () => {
    expect(fieldsOfSection(schema, null).map((f) => f.key)).toEqual(['solto'])
  })

  it('returns nothing for a section with no fields', () => {
    expect(fieldsOfSection(schema, 'exame-fisico')).toEqual([])
  })
})
