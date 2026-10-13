import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { IRecordFieldModel, ITemplateSectionModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { Card, CardTitle } from '../../../components/ui/card'
import { TextField } from '../../../components/ui/fields'
import { DynamicField } from './dynamic-field'
import {
  buildInitialValues,
  fieldsOfSection,
  findMissingRequired,
  toRecordData,
  type RecordFormValues,
} from '../utils/record-form.util'

/**
 * O formulário em si, separado da tela.
 *
 * A tela decide *se* há o que preencher — carregando, falhou, sem modelo, qual
 * modelo. Aqui já se sabe que há um schema, e o estado do formulário pode
 * viver com ele. Enquanto os dois estavam juntos, metade das guardas existia
 * só para convencer o compilador de algo que a tela já tinha garantido.
 */
export function RecordForm({
  schema,
  sections,
  savedData,
  savedNotes,
  isExisting,
  isSaving,
  onSave,
}: {
  schema: IRecordFieldModel[]
  sections: ITemplateSectionModel[]
  savedData: Record<string, unknown> | null
  savedNotes: string
  isExisting: boolean
  isSaving: boolean
  onSave: (data: Record<string, unknown>, notes: string | null) => void
}) {
  const [values, setValues] = useState<RecordFormValues>(() =>
    buildInitialValues(schema, savedData),
  )
  const [notes, setNotes] = useState(savedNotes)
  const [missing, setMissing] = useState<string[]>([])

  function handleSave() {
    const blanks = findMissingRequired(schema, values)
    setMissing(blanks.map((field) => field.key))
    if (blanks.length > 0) return

    onSave(toRecordData(schema, values), notes ? notes : null)
  }

  const renderField = (field: IRecordFieldModel) => (
    <DynamicField
      key={field.key}
      field={field}
      value={values[field.key]}
      error={missing.includes(field.key) ? 'Campo obrigatório' : null}
      onChange={(value) => setValues({ ...values, [field.key]: value })}
    />
  )

  const looseFields = fieldsOfSection(schema, null)

  return (
    <>
      {sections.map((section) => {
        const fields = fieldsOfSection(schema, section.key)
        if (fields.length === 0) return null
        return (
          <Card key={section.key} testID={`section-${section.key}`}>
            <CardTitle>{section.title}</CardTitle>
            {fields.map(renderField)}
          </Card>
        )
      })}

      {looseFields.length > 0 ? (
        <Card testID="section-loose">{looseFields.map(renderField)}</Card>
      ) : null}

      <Card testID="notes-card">
        <TextField
          label="Observações"
          value={notes}
          onChange={setNotes}
          multiline
          testID="record-notes"
        />
      </Card>

      {missing.length > 0 ? (
        <Text style={styles.warning} testID="missing-required">
          Preencha os campos obrigatórios antes de salvar.
        </Text>
      ) : null}

      <Button
        label={isExisting ? 'Salvar alterações' : 'Salvar prontuário'}
        loading={isSaving}
        onPress={handleSave}
        testID="save-medical-record"
      />
    </>
  )
}

const styles = StyleSheet.create({
  warning: { fontSize: 14, color: '#b91c1c', textAlign: 'center' },
})
