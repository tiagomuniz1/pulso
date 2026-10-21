import { MedicalRecordFieldType } from '@app/shared'
import type { ICanonicalFieldModel, ITemplateModel } from '@app/core'
import {
  containerOptions,
  emptyField,
  fieldAddress,
  fieldFromCanonical,
  hasErrors,
  moveFieldToContainer,
  moveItem,
  needsOptions,
  newSectionKey,
  toDraft,
  toTemplatePayload,
  validateDraft,
  type IFieldDraft,
  type ITemplateDraft,
} from './template-draft.util'

const field = (overrides: Partial<IFieldDraft> = {}): IFieldDraft => ({
  ...emptyField(),
  label: 'Queixa principal',
  ...overrides,
})

const draft = (overrides: Partial<ITemplateDraft> = {}): ITemplateDraft => ({
  name: 'Anamnese',
  fields: [],
  sections: [],
  ...overrides,
})

describe('needsOptions', () => {
  it.each([
    [MedicalRecordFieldType.SELECT, true],
    [MedicalRecordFieldType.MULTISELECT, true],
    [MedicalRecordFieldType.TEXT, false],
    [MedicalRecordFieldType.DATE, false],
  ])('%s → %s', (type, expected) => {
    expect(needsOptions(type)).toBe(expected)
  })
})

describe('emptyField', () => {
  it('nasce texto, não obrigatório e sem chave', () => {
    const created = emptyField()

    expect(created.type).toBe(MedicalRecordFieldType.TEXT)
    expect(created.required).toBe(false)
    expect(created).not.toHaveProperty('key')
  })
})

/**
 * Adotar é copiar. O que prende o campo ao catálogo é a `canonicalKey` — é
 * por ela que dois modelos dizem "isto é a mesma pressão arterial".
 */
describe('fieldFromCanonical', () => {
  const canonical = (overrides: Partial<ICanonicalFieldModel> = {}): ICanonicalFieldModel => ({
    id: 'c1',
    canonicalKey: 'blood_pressure',
    label: 'Pressão arterial',
    type: MedicalRecordFieldType.TEXT,
    options: null,
    unit: null,
    description: null,
    ...overrides,
  })

  it('traz rótulo, tipo e a chave canônica', () => {
    const adopted = fieldFromCanonical(canonical())

    expect(adopted).toMatchObject({
      label: 'Pressão arterial',
      type: MedicalRecordFieldType.TEXT,
      canonical: true,
      canonicalKey: 'blood_pressure',
      required: false,
      options: [],
    })
  })

  it('copia as opções em vez de compartilhá-las', () => {
    const source = canonical({
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'a', label: 'A' }],
    })

    const adopted = fieldFromCanonical(source)
    adopted.options[0].label = 'Editado'

    expect(source.options?.[0].label).toBe('A')
  })
})

describe('newSectionKey', () => {
  it('não repete', () => {
    expect(newSectionKey()).not.toBe(newSectionKey())
  })
})

/**
 * A ordem vem de `order`, não do array: é `order` que o construtor
 * manipula, e confiar na ordem de chegada reordenaria a tela de quem só
 * abriu para olhar.
 */
describe('toDraft', () => {
  const template = (overrides: Partial<ITemplateModel> = {}): ITemplateModel =>
    ({
      id: 't1',
      specialtyId: null,
      specialtyName: null,
      councilType: null,
      name: 'Anamnese',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [],
      sections: [],
      ...overrides,
    }) as ITemplateModel

  const saved = (overrides: Record<string, unknown> = {}) =>
    ({
      key: 'f1',
      label: 'Campo',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
      ...overrides,
    }) as never

  it('ordena os campos gerais por order', () => {
    const result = toDraft(
      template({
        fields: [
          saved({ key: 'b', label: 'Segundo', order: 1 }),
          saved({ key: 'a', label: 'Primeiro', order: 0 }),
        ],
      }),
    )

    expect(result.fields.map((f) => f.label)).toEqual(['Primeiro', 'Segundo'])
  })

  it('separa os campos da seção dos gerais', () => {
    const result = toDraft(
      template({
        sections: [{ key: 's1', title: 'Exame físico', order: 0 }],
        fields: [
          saved({ key: 'a', label: 'Geral', order: 0 }),
          saved({ key: 'b', label: 'Da seção', order: 0, sectionKey: 's1' }),
        ],
      }),
    )

    expect(result.fields.map((f) => f.label)).toEqual(['Geral'])
    expect(result.sections[0].fields.map((f) => f.label)).toEqual(['Da seção'])
  })

  it('ordena as seções por order', () => {
    const result = toDraft(
      template({
        sections: [
          { key: 's2', title: 'Segunda', order: 1 },
          { key: 's1', title: 'Primeira', order: 0 },
        ],
      }),
    )

    expect(result.sections.map((s) => s.title)).toEqual(['Primeira', 'Segunda'])
  })

  // Nulo num `TextInput` controlado o torna não controlado, e o campo para
  // de aceitar digitação.
  it('troca os nulos por texto vazio', () => {
    const result = toDraft(template({ fields: [saved()] }))

    expect(result.fields[0]).toMatchObject({
      placeholder: '',
      helpText: '',
      canonicalKey: '',
      options: [],
    })
  })

  // `key` é opcional no modelo: um campo que o servidor devolva sem ela
  // não pode virar `key: undefined`, que iria no corpo do PATCH como uma
  // chave explícita e vazia.
  it('campo sem chave não ganha uma vazia', () => {
    const result = toDraft(template({ fields: [saved({ key: undefined })] }))

    expect(result.fields[0]).not.toHaveProperty('key')
  })

  it('preserva as opções e a chave do campo gravado', () => {
    const result = toDraft(
      template({
        fields: [
          saved({
            key: 'f9',
            type: MedicalRecordFieldType.SELECT,
            options: [{ value: 'sim', label: 'Sim' }],
            canonical: true,
            canonicalKey: 'smoker',
            placeholder: 'p',
            helpText: 'h',
          }),
        ],
      }),
    )

    expect(result.fields[0]).toMatchObject({
      key: 'f9',
      options: [{ value: 'sim', label: 'Sim' }],
      canonical: true,
      canonicalKey: 'smoker',
      placeholder: 'p',
      helpText: 'h',
    })
  })
})

/**
 * `order` é a posição no array, recalculada na saída: manter um `order`
 * paralelo seriam dois números para a mesma coisa, que divergem na
 * primeira remoção.
 */
describe('toTemplatePayload', () => {
  it('numera os campos pela posição', () => {
    const payload = toTemplatePayload(
      draft({ fields: [field({ label: 'A' }), field({ label: 'B' })] }),
    )

    expect(payload.fields.map((f) => [f.label, f.order])).toEqual([
      ['A', 0],
      ['B', 1],
    ])
  })

  it('amarra o campo da seção à chave dela', () => {
    const payload = toTemplatePayload(
      draft({
        sections: [{ key: 's1', title: 'Exame', fields: [field({ label: 'Ausculta' })] }],
      }),
    )

    expect(payload.fields[0].sectionKey).toBe('s1')
    expect(payload.sections).toEqual([{ key: 's1', title: 'Exame', order: 0 }])
  })

  it('apara o que foi digitado', () => {
    const payload = toTemplatePayload(
      draft({
        fields: [field({ label: '  Peso  ', placeholder: ' kg ', helpText: ' em jejum ' })],
        sections: [{ key: 's1', title: '  Exame  ', fields: [] }],
      }),
    )

    expect(payload.fields[0]).toMatchObject({ label: 'Peso', placeholder: 'kg', helpText: 'em jejum' })
    expect(payload.sections[0].title).toBe('Exame')
  })

  /**
   * Opção de um tipo que não usa opção é lixo que volta a aparecer se o
   * tipo for trocado de volta — e o servidor a guardaria sem ninguém pedir.
   */
  it('descarta as opções de um campo que não as usa', () => {
    const payload = toTemplatePayload(
      draft({
        fields: [
          field({ type: MedicalRecordFieldType.TEXT, options: [{ value: 'a', label: 'A' }] }),
        ],
      }),
    )

    expect(payload.fields[0].options).toEqual([])
  })

  it('mantém as opções de um campo de seleção', () => {
    const payload = toTemplatePayload(
      draft({
        fields: [
          field({ type: MedicalRecordFieldType.SELECT, options: [{ value: 'a', label: 'A' }] }),
        ],
      }),
    )

    expect(payload.fields[0].options).toEqual([{ value: 'a', label: 'A' }])
  })

  it('o campo novo vai sem chave; o gravado leva a dele', () => {
    const payload = toTemplatePayload(
      draft({ fields: [field(), field({ key: 'f1' })] }),
    )

    expect(payload.fields[0]).not.toHaveProperty('key')
    expect(payload.fields[1].key).toBe('f1')
  })
})

describe('moveItem', () => {
  it('troca com o vizinho', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it.each([
    ['antes do início', 0, -1],
    ['além do fim', 2, 3],
  ])('%s devolve a lista intacta', (_caso, from, to) => {
    const items = ['a', 'b', 'c']

    expect(moveItem(items, from, to)).toBe(items)
  })
})

describe('containerOptions', () => {
  it('oferece as seções e não oferece onde o campo já está', () => {
    const options = containerOptions(
      draft({ sections: [{ key: 's1', title: 'Exame', fields: [] }] }),
      'flat',
    )

    expect(options).toEqual([{ value: 'section:s1', label: 'Exame' }])
  })

  it('a seção sem título ganha um número', () => {
    const options = containerOptions(
      draft({ sections: [{ key: 's1', title: '   ', fields: [] }] }),
      'flat',
    )

    expect(options[0].label).toBe('Seção 1')
  })

  it('de dentro de uma seção, os campos gerais são destino', () => {
    const options = containerOptions(
      draft({ sections: [{ key: 's1', title: 'Exame', fields: [] }] }),
      'section:s1',
    )

    expect(options).toEqual([{ value: 'flat', label: 'Campos gerais' }])
  })
})

describe('moveFieldToContainer', () => {
  const withSection = draft({
    fields: [field({ label: 'Geral' })],
    sections: [{ key: 's1', title: 'Exame', fields: [field({ label: 'Da seção' })] }],
  })

  it('leva o campo geral para a seção', () => {
    const result = moveFieldToContainer(withSection, 'flat', 0, 'section:s1')

    expect(result.fields).toEqual([])
    expect(result.sections[0].fields.map((f) => f.label)).toEqual(['Da seção', 'Geral'])
  })

  it('traz o campo da seção de volta para os gerais', () => {
    const result = moveFieldToContainer(withSection, 'section:s1', 0, 'flat')

    expect(result.sections[0].fields).toEqual([])
    expect(result.fields.map((f) => f.label)).toEqual(['Geral', 'Da seção'])
  })

  it('índice que não existe não mexe em nada', () => {
    expect(moveFieldToContainer(withSection, 'flat', 9, 'section:s1')).toBe(withSection)
  })

  it('origem que não existe não mexe em nada', () => {
    expect(moveFieldToContainer(withSection, 'section:sumiu', 0, 'flat')).toBe(withSection)
  })
})

describe('validateDraft', () => {
  it('aceita o modelo completo', () => {
    const errors = validateDraft(draft({ fields: [field()] }))

    expect(hasErrors(errors)).toBe(false)
  })

  it('recusa nome curto', () => {
    expect(validateDraft(draft({ name: 'A', fields: [field()] })).name).toBe('Mínimo 2 caracteres')
  })

  it('recusa nome que é só espaço', () => {
    expect(validateDraft(draft({ name: '   ', fields: [field()] })).name).toBeDefined()
  })

  /**
   * Um modelo sem campo nenhum é um formulário em branco no atendimento —
   * e o profissional não tem como consertá-lo, porque o modelo é da
   * clínica.
   */
  it('recusa modelo sem campo algum', () => {
    expect(validateDraft(draft()).fields).toBe('Adicione ao menos um campo')
  })

  it('campo dentro de seção já conta', () => {
    const errors = validateDraft(
      draft({ sections: [{ key: 's1', title: 'Exame', fields: [field()] }] }),
    )

    expect(errors.fields).toBeUndefined()
  })

  it('recusa campo sem rótulo', () => {
    const errors = validateDraft(draft({ fields: [field({ label: '  ' })] }))

    expect(errors.fieldLabels[fieldAddress('flat', 0)]).toBe('Rótulo obrigatório')
  })

  it('aponta o rótulo faltante dentro da seção', () => {
    const errors = validateDraft(
      draft({ sections: [{ key: 's1', title: 'Exame', fields: [field({ label: '' })] }] }),
    )

    expect(errors.fieldLabels[fieldAddress('section:s1', 0)]).toBe('Rótulo obrigatório')
  })

  it('recusa seção sem título', () => {
    const errors = validateDraft(
      draft({ sections: [{ key: 's1', title: '', fields: [field()] }] }),
    )

    expect(errors.sectionTitles[0]).toBe('Título da seção obrigatório')
  })

  // Seleção sem opção vira uma lista vazia no prontuário.
  it('recusa seleção sem opção', () => {
    const errors = validateDraft(
      draft({ fields: [field({ type: MedicalRecordFieldType.SELECT })] }),
    )

    expect(errors.fieldOptions[fieldAddress('flat', 0)]).toMatch(/ao menos uma opção/)
  })

  it('recusa opção pela metade', () => {
    const errors = validateDraft(
      draft({
        fields: [
          field({
            type: MedicalRecordFieldType.SELECT,
            options: [{ value: 'a', label: '  ' }],
          }),
        ],
      }),
    )

    expect(errors.fieldOptions[fieldAddress('flat', 0)]).toMatch(/valor e rótulo/)
  })

  it('recusa opção sem valor', () => {
    const errors = validateDraft(
      draft({
        fields: [
          field({ type: MedicalRecordFieldType.SELECT, options: [{ value: '', label: 'A' }] }),
        ],
      }),
    )

    expect(errors.fieldOptions[fieldAddress('flat', 0)]).toMatch(/valor e rótulo/)
  })

  // Dois valores iguais fazem a resposta da paciente deixar de ser
  // identificável — "a" apareceria duas vezes no prontuário.
  it('recusa valores repetidos', () => {
    const errors = validateDraft(
      draft({
        fields: [
          field({
            type: MedicalRecordFieldType.SELECT,
            options: [
              { value: 'a', label: 'A' },
              { value: ' a ', label: 'Outro' },
            ],
          }),
        ],
      }),
    )

    expect(errors.fieldOptions[fieldAddress('flat', 0)]).toMatch(/únicos/)
  })

  it('aceita seleção com opções distintas', () => {
    const errors = validateDraft(
      draft({
        fields: [
          field({
            type: MedicalRecordFieldType.SELECT,
            options: [
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ],
          }),
        ],
      }),
    )

    expect(hasErrors(errors)).toBe(false)
  })

  it('não cobra opção de campo de texto', () => {
    const errors = validateDraft(
      draft({ fields: [field({ type: MedicalRecordFieldType.TEXT })] }),
    )

    expect(hasErrors(errors)).toBe(false)
  })
})

describe('hasErrors', () => {
  it.each([
    ['nome', { name: 'x' }],
    ['total de campos', { fields: 'x' }],
    ['rótulo', { fieldLabels: { 'flat:0': 'x' } }],
    ['opções', { fieldOptions: { 'flat:0': 'x' } }],
    ['título de seção', { sectionTitles: { 0: 'x' } }],
  ])('acusa erro de %s', (_caso, partial) => {
    expect(
      hasErrors({ fieldLabels: {}, fieldOptions: {}, sectionTitles: {}, ...partial }),
    ).toBe(true)
  })

  it('sem nada, não acusa', () => {
    expect(hasErrors({ fieldLabels: {}, fieldOptions: {}, sectionTitles: {} })).toBe(false)
  })
})
