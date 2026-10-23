import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CouncilType, COUNCIL_TYPE_PROFESSION_LABELS } from '@app/shared'
import type { IApiError, ICanonicalFieldModel, ITemplateModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'
import {
  containerOptions,
  emptyField,
  fieldAddress,
  fieldFromCanonical,
  hasErrors,
  moveFieldToContainer,
  moveItem,
  newSectionKey,
  toDraft,
  toTemplatePayload,
  validateDraft,
  type IFieldDraft,
  type ISectionDraft,
  type ITemplateDraft,
  type ITemplateDraftErrors,
} from '../utils/template-draft.util'
import { ArrowButton, FieldEditor } from './field-editor'
import { CanonicalFieldPicker } from './canonical-field-picker'

const EMPTY_ERRORS: ITemplateDraftErrors = {
  fieldLabels: {},
  fieldOptions: {},
  sectionTitles: {},
}

export interface ITemplateFormOutput {
  name: string
  specialtyId?: string
  councilType?: CouncilType
  fields: ReturnType<typeof toTemplatePayload>['fields']
  sections: ReturnType<typeof toTemplatePayload>['sections']
}

/**
 * O construtor de modelos.
 *
 * Campos gerais primeiro, depois as seções, depois o catálogo canônico —
 * a mesma ordem da web, que é a ordem em que a pessoa monta: o essencial
 * solto, o agrupado em seguida.
 *
 * **Escopo só existe ao criar.** Mudar a especialidade de um modelo que já
 * tem prontuários mudaria a quem eles pertencem; o backend não aceita, e o
 * formulário de edição nem oferece.
 */
export function TemplateForm({
  template,
  specialties,
  showProfession,
  allowSpecialty,
  isPending,
  submitError,
  onSubmit,
  onCancel,
}: {
  /** `null` ao criar. */
  template: ITemplateModel | null
  specialties: { id: string; name: string }[]
  /** Só o ADMIN escolhe a profissão; a do profissional vem da ficha dele. */
  showProfession: boolean
  /** Para quem não escolhe profissão: se a dele comporta especialidade. */
  allowSpecialty: boolean
  isPending: boolean
  submitError: IApiError | null
  onSubmit: (output: ITemplateFormOutput) => void
  onCancel: () => void
}) {
  const theme = useTheme()
  const isEdit = Boolean(template)

  const [draft, setDraft] = useState<ITemplateDraft>(() =>
    template ? toDraft(template) : { name: '', fields: [], sections: [] },
  )
  const [specialtyId, setSpecialtyId] = useState('')
  const [councilType, setCouncilType] = useState<CouncilType>(CouncilType.CRM)
  const [errors, setErrors] = useState<ITemplateDraftErrors>(EMPTY_ERRORS)

  /**
   * Especialidade só existe para Medicina — as demais profissões vão
   * direto ao modelo generalista. Oferecer o seletor fora do CRM proporia
   * uma combinação que o servidor descarta.
   *
   * Quem escolhe profissão decide pelo seletor; quem não escolhe (o
   * profissional) decide pelo conselho da própria ficha, que o chamador
   * resolve.
   */
  const showSpecialty =
    !isEdit && (showProfession ? councilType === CouncilType.CRM : allowSpecialty)

  function updateDraft(changes: Partial<ITemplateDraft>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function updateSection(index: number, changes: Partial<ISectionDraft>) {
    updateDraft({
      sections: draft.sections.map((section, at) =>
        at === index ? { ...section, ...changes } : section,
      ),
    })
  }

  function changeCouncil(value: string) {
    setCouncilType(value as CouncilType)
    // Trocar para uma profissão sem especialidade deixaria para trás uma
    // escolha que não aparece mais na tela e iria no corpo mesmo assim.
    if (value !== CouncilType.CRM) setSpecialtyId('')
  }

  function adopt(canonical: ICanonicalFieldModel) {
    updateDraft({ fields: [...draft.fields, fieldFromCanonical(canonical)] })
  }

  function handleSubmit() {
    const found = validateDraft(draft)
    setErrors(found)
    if (hasErrors(found)) return

    const payload = toTemplatePayload(draft)
    onSubmit({
      name: draft.name.trim(),
      ...(isEdit
        ? {}
        : specialtyId
          ? { specialtyId }
          : { councilType: showProfession ? councilType : undefined }),
      ...payload,
    })
  }

  function renderField(field: IFieldDraft, index: number, container: string, testID: string) {
    const address = fieldAddress(container, index)
    const list = container === 'flat' ? draft.fields : sectionOf(container).fields

    return (
      <FieldEditor
        key={`${container}-${index}`}
        field={field}
        index={index}
        total={list.length}
        labelError={errors.fieldLabels[address]}
        optionsError={errors.fieldOptions[address]}
        containers={containerOptions(draft, container)}
        onChange={(next) => replaceField(container, index, next)}
        onMoveUp={() => reorderField(container, index, index - 1)}
        onMoveDown={() => reorderField(container, index, index + 1)}
        onMoveTo={(target) => setDraft(moveFieldToContainer(draft, container, index, target))}
        onRemove={() => removeField(container, index)}
        testID={testID}
      />
    )
  }

  function sectionOf(container: string): ISectionDraft {
    return draft.sections.find((section) => `section:${section.key}` === container) as ISectionDraft
  }

  function mapSectionFields(
    container: string,
    change: (fields: IFieldDraft[]) => IFieldDraft[],
  ) {
    updateDraft({
      sections: draft.sections.map((section) =>
        `section:${section.key}` === container ? { ...section, fields: change(section.fields) } : section,
      ),
    })
  }

  function replaceField(container: string, index: number, next: IFieldDraft) {
    const change = (fields: IFieldDraft[]) => fields.map((f, at) => (at === index ? next : f))
    if (container === 'flat') updateDraft({ fields: change(draft.fields) })
    else mapSectionFields(container, change)
  }

  function removeField(container: string, index: number) {
    const change = (fields: IFieldDraft[]) => fields.filter((_, at) => at !== index)
    if (container === 'flat') updateDraft({ fields: change(draft.fields) })
    else mapSectionFields(container, change)
  }

  function reorderField(container: string, from: number, to: number) {
    const change = (fields: IFieldDraft[]) => moveItem(fields, from, to)
    if (container === 'flat') updateDraft({ fields: change(draft.fields) })
    else mapSectionFields(container, change)
  }

  return (
    <View style={styles.form} testID="template-form">
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="template-form-error">
          {submitError.status === 409
            ? 'Já existe um modelo com este nome neste escopo.'
            : 'Não foi possível salvar o modelo. Tente de novo.'}
        </Text>
      ) : null}

      <TextField
        label="Nome do modelo"
        required
        value={draft.name}
        onChange={(name) => updateDraft({ name })}
        placeholder="Ex: Anamnese Cardiológica"
        error={errors.name}
        testID="template-form-name"
      />

      {showProfession && !isEdit ? (
        <View style={styles.selectField}>
          <Text style={[styles.selectLabel, { color: theme.text }]}>Profissão</Text>
          <SelectField
            value={councilType}
            options={Object.values(CouncilType).map((council) => ({
              value: council,
              label: COUNCIL_TYPE_PROFESSION_LABELS[council],
            }))}
            onChange={changeCouncil}
            placeholder="Profissão"
            testID="template-form-council-type"
          />
        </View>
      ) : null}

      {showSpecialty ? (
        <View style={styles.selectField}>
          <Text style={[styles.selectLabel, { color: theme.text }]}>Especialidade</Text>
          <SelectField
            value={specialtyId}
            options={[
              { value: '', label: 'Generalista (sem especialidade)' },
              ...specialties.map((specialty) => ({ value: specialty.id, label: specialty.name })),
            ]}
            onChange={setSpecialtyId}
            placeholder="Especialidade"
            testID="template-form-specialty"
          />
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.heading, { color: theme.text }]}>Campos</Text>
        <Button
          label="+ Adicionar campo"
          variant="outline"
          onPress={() => updateDraft({ fields: [...draft.fields, emptyField()] })}
          testID="template-form-add-field"
        />
      </View>

      {errors.fields ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="template-form-fields-error">
          {errors.fields}
        </Text>
      ) : null}

      {draft.fields.length === 0 && draft.sections.length === 0 ? (
        <Text
          style={{ color: theme.textMute, fontSize: 13 }}
          testID="template-form-fields-empty"
        >
          Nenhum campo adicionado. Use os botões acima para adicionar campos ou seções.
        </Text>
      ) : null}

      {draft.fields.map((field, index) => renderField(field, index, 'flat', `field-editor-${index}`))}

      <View style={styles.sectionHeader}>
        <Text style={[styles.heading, { color: theme.text }]}>Seções</Text>
        <Button
          label="+ Adicionar seção"
          variant="outline"
          onPress={() =>
            updateDraft({
              sections: [...draft.sections, { key: newSectionKey(), title: '', fields: [] }],
            })
          }
          testID="template-form-add-section"
        />
      </View>

      {draft.sections.map((section, index) => {
        const container = `section:${section.key}`
        return (
          <View
            key={section.key}
            style={[styles.section, { borderColor: theme.line, borderRadius: theme.radius.lg }]}
            testID={`section-editor-${index}`}
          >
            <View style={styles.sectionTop}>
              <View style={styles.sectionTitle}>
                <TextField
                  label="Título da seção"
                  required
                  value={section.title}
                  onChange={(title) => updateSection(index, { title })}
                  placeholder="Ex: Exame físico"
                  error={errors.sectionTitles[index]}
                  testID={`section-editor-title-${index}`}
                />
              </View>
              <View style={styles.arrows}>
                <ArrowButton
                  label="↑"
                  accessibilityLabel="Mover seção para cima"
                  disabled={index === 0}
                  onPress={() => updateDraft({ sections: moveItem(draft.sections, index, index - 1) })}
                  testID={`section-editor-move-up-${index}`}
                />
                <ArrowButton
                  label="↓"
                  accessibilityLabel="Mover seção para baixo"
                  disabled={index === draft.sections.length - 1}
                  onPress={() => updateDraft({ sections: moveItem(draft.sections, index, index + 1) })}
                  testID={`section-editor-move-down-${index}`}
                />
                <ArrowButton
                  label="✕"
                  accessibilityLabel="Remover seção"
                  tone="danger"
                  onPress={() =>
                    updateDraft({ sections: draft.sections.filter((_, at) => at !== index) })
                  }
                  testID={`section-editor-remove-${index}`}
                />
              </View>
            </View>

            {section.fields.length === 0 ? (
              <Text
                style={{ color: theme.textMute, fontSize: 12 }}
                testID={`section-editor-fields-empty-${index}`}
              >
                Nenhum campo nesta seção.
              </Text>
            ) : null}

            {section.fields.map((field, at) =>
              renderField(field, at, container, `section-field-editor-${index}-${at}`),
            )}

            <Button
              label="+ Adicionar campo"
              variant="outline"
              onPress={() => mapSectionFields(container, (fields) => [...fields, emptyField()])}
              testID={`section-editor-add-field-${index}`}
            />
          </View>
        )
      })}

      <Text style={[styles.heading, { color: theme.text }]}>Campos canônicos</Text>
      <Text style={{ color: theme.textDim, fontSize: 13 }}>
        Adote campos padronizados da plataforma para garantir consistência entre modelos.
      </Text>
      <CanonicalFieldPicker onAdopt={adopt} testID="canonical-field-picker" />

      <Button
        label={isEdit ? 'Salvar alterações' : 'Criar modelo'}
        loading={isPending}
        onPress={handleSubmit}
        testID="template-form-submit"
      />
      <Button
        label="Cancelar"
        variant="outline"
        onPress={onCancel}
        testID="template-form-cancel"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  error: { fontSize: 13 },
  selectField: { gap: 6 },
  selectLabel: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { gap: 8, marginTop: 4 },
  heading: { fontSize: 15, fontWeight: '600' },
  section: { borderWidth: 1, padding: 12, gap: 10 },
  sectionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sectionTitle: { flex: 1 },
  arrows: { flexDirection: 'row', gap: 6, paddingTop: 22 },
})
