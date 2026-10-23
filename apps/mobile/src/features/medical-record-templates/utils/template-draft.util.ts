import { MedicalRecordFieldType } from '@app/shared'
import type {
  ICanonicalFieldModel,
  ITemplateFieldInput,
  ITemplateFieldModel,
  ITemplateModel,
  ITemplateSectionInput,
} from '@app/core'

const SELECT_TYPES: MedicalRecordFieldType[] = [
  MedicalRecordFieldType.SELECT,
  MedicalRecordFieldType.MULTISELECT,
]

export interface IFieldDraft {
  /** Ausente no campo novo; o do servidor traz o seu. */
  key?: string
  label: string
  type: MedicalRecordFieldType
  required: boolean
  options: { value: string; label: string }[]
  placeholder: string
  helpText: string
  canonical: boolean
  canonicalKey: string
}

export interface ISectionDraft {
  key: string
  title: string
  fields: IFieldDraft[]
}

export interface ITemplateDraft {
  name: string
  fields: IFieldDraft[]
  sections: ISectionDraft[]
}

export function needsOptions(type: MedicalRecordFieldType): boolean {
  return SELECT_TYPES.includes(type)
}

export function emptyField(): IFieldDraft {
  return {
    label: '',
    type: MedicalRecordFieldType.TEXT,
    required: false,
    options: [],
    placeholder: '',
    helpText: '',
    canonical: false,
    canonicalKey: '',
  }
}

/**
 * Adotar um campo canônico é copiá-lo, não referenciá-lo.
 *
 * O que fica preso ao catálogo é a `canonicalKey` — é por ela que dois
 * modelos diferentes dizem "isto é a mesma pressão arterial". Rótulo e
 * opções viram rascunho e a clínica ajusta à vontade.
 */
export function fieldFromCanonical(canonical: ICanonicalFieldModel): IFieldDraft {
  return {
    label: canonical.label,
    type: canonical.type,
    required: false,
    options: canonical.options ? canonical.options.map((option) => ({ ...option })) : [],
    placeholder: '',
    helpText: '',
    canonical: true,
    canonicalKey: canonical.canonicalKey,
  }
}

/** Chave de seção criada no cliente — o servidor só a vê no `POST`. */
export function newSectionKey(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function toDraftField(field: ITemplateFieldModel): IFieldDraft {
  return {
    ...(field.key ? { key: field.key } : {}),
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options ? field.options.map((option) => ({ ...option })) : [],
    placeholder: field.placeholder ?? '',
    helpText: field.helpText ?? '',
    canonical: field.canonical,
    canonicalKey: field.canonicalKey ?? '',
  }
}

/**
 * Modelo gravado → rascunho editável.
 *
 * A ordem vem do campo `order`, não da ordem em que o servidor devolveu: é
 * ele que o construtor manipula, e confiar no array seria reordenar a tela
 * de quem só abriu para olhar.
 */
export function toDraft(template: ITemplateModel): ITemplateDraft {
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order

  return {
    name: template.name,
    fields: [...template.fields]
      .filter((field) => !field.sectionKey)
      .sort(byOrder)
      .map(toDraftField),
    sections: [...template.sections].sort(byOrder).map((section) => ({
      key: section.key,
      title: section.title,
      fields: [...template.fields]
        .filter((field) => field.sectionKey === section.key)
        .sort(byOrder)
        .map(toDraftField),
    })),
  }
}

function toFieldInputs(fields: IFieldDraft[], sectionKey: string): ITemplateFieldInput[] {
  return fields.map((field, index) => ({
    ...(field.key ? { key: field.key } : {}),
    label: field.label.trim(),
    type: field.type,
    required: field.required,
    order: index,
    options: needsOptions(field.type) ? field.options : [],
    placeholder: field.placeholder.trim(),
    helpText: field.helpText.trim(),
    canonical: field.canonical,
    canonicalKey: field.canonicalKey,
    sectionKey,
  }))
}

/**
 * Rascunho → o que vai no corpo.
 *
 * `order` é a posição no array, recalculada aqui: as setas mexem no array
 * e manter um `order` paralelo seria dois números para a mesma coisa, que
 * divergem na primeira remoção.
 */
export function toTemplatePayload(draft: ITemplateDraft): {
  fields: ITemplateFieldInput[]
  sections: ITemplateSectionInput[]
} {
  return {
    fields: [
      ...toFieldInputs(draft.fields, ''),
      ...draft.sections.flatMap((section) => toFieldInputs(section.fields, section.key)),
    ],
    sections: draft.sections.map((section, index) => ({
      key: section.key,
      title: section.title.trim(),
      order: index,
    })),
  }
}

/** Troca um item de lugar com o vizinho. Fora da lista, devolve a lista. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Onde um campo pode ser posto, a partir de onde ele está. */
export function containerOptions(
  draft: ITemplateDraft,
  current: string,
): { value: string; label: string }[] {
  const sections = draft.sections.map((section, index) => ({
    value: `section:${section.key}`,
    label: section.title.trim() || `Seção ${index + 1}`,
  }))
  return [{ value: 'flat', label: 'Campos gerais' }, ...sections].filter(
    (option) => option.value !== current,
  )
}

/** Tira o campo de onde está e o põe no fim do destino. */
export function moveFieldToContainer(
  draft: ITemplateDraft,
  from: string,
  index: number,
  to: string,
): ITemplateDraft {
  const source = from === 'flat' ? draft.fields : sectionFields(draft, from)
  const field = source[index]
  if (!field) return draft

  const without: ITemplateDraft = {
    ...draft,
    fields: from === 'flat' ? draft.fields.filter((_, at) => at !== index) : draft.fields,
    sections: draft.sections.map((section) =>
      `section:${section.key}` === from
        ? { ...section, fields: section.fields.filter((_, at) => at !== index) }
        : section,
    ),
  }

  return {
    ...without,
    fields: to === 'flat' ? [...without.fields, field] : without.fields,
    sections: without.sections.map((section) =>
      `section:${section.key}` === to ? { ...section, fields: [...section.fields, field] } : section,
    ),
  }
}

function sectionFields(draft: ITemplateDraft, container: string): IFieldDraft[] {
  return draft.sections.find((section) => `section:${section.key}` === container)?.fields ?? []
}

export interface ITemplateDraftErrors {
  name?: string
  fields?: string
  fieldLabels: Record<string, string>
  fieldOptions: Record<string, string>
  sectionTitles: Record<number, string>
}

export function fieldAddress(container: string, index: number): string {
  return `${container}:${index}`
}

/**
 * O que impede de salvar.
 *
 * Fora rótulo e nome, a regra que mais morde é a das opções: um campo de
 * seleção sem opção vira uma lista vazia no prontuário, e dois valores
 * iguais fazem a resposta da paciente deixar de ser identificável.
 */
export function validateDraft(draft: ITemplateDraft): ITemplateDraftErrors {
  const errors: ITemplateDraftErrors = {
    fieldLabels: {},
    fieldOptions: {},
    sectionTitles: {},
  }

  if (draft.name.trim().length < 2) errors.name = 'Mínimo 2 caracteres'

  const total = draft.fields.length + draft.sections.reduce((sum, s) => sum + s.fields.length, 0)
  if (total === 0) errors.fields = 'Adicione ao menos um campo'

  function checkFields(fields: IFieldDraft[], container: string) {
    fields.forEach((field, index) => {
      const address = fieldAddress(container, index)
      if (!field.label.trim()) errors.fieldLabels[address] = 'Rótulo obrigatório'
      if (!needsOptions(field.type)) return

      if (field.options.length === 0) {
        errors.fieldOptions[address] = 'Adicione ao menos uma opção para este tipo de campo.'
        return
      }
      if (field.options.some((option) => !option.value.trim() || !option.label.trim())) {
        errors.fieldOptions[address] = 'Preencha valor e rótulo de cada opção.'
        return
      }
      const values = field.options.map((option) => option.value.trim())
      if (new Set(values).size !== values.length) {
        errors.fieldOptions[address] = 'Os valores das opções devem ser únicos.'
      }
    })
  }

  checkFields(draft.fields, 'flat')
  draft.sections.forEach((section, index) => {
    if (!section.title.trim()) errors.sectionTitles[index] = 'Título da seção obrigatório'
    checkFields(section.fields, `section:${section.key}`)
  })

  return errors
}

export function hasErrors(errors: ITemplateDraftErrors): boolean {
  return Boolean(
    errors.name ||
      errors.fields ||
      Object.keys(errors.fieldLabels).length > 0 ||
      Object.keys(errors.fieldOptions).length > 0 ||
      Object.keys(errors.sectionTitles).length > 0,
  )
}
