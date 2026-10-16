import { StyleSheet, Text, View } from 'react-native'
import { formatFieldValue, type IMedicalRecordModel } from '@app/core'
import { Card, CardTitle } from '../../../components/ui/card'
import { useTheme } from '../../../theme/theme-context'
import { fieldsOfSection } from '../utils/record-form.util'

/**
 * O prontuário só de leitura.
 *
 * Aparece quando a consulta foi concluída — o backend recusa editar depois
 * disso (`422`), e oferecer o formulário seria oferecer um caminho que só
 * termina em erro. As seções são as mesmas do formulário, pelo schema que
 * ficou congelado no registro.
 */
export function RecordView({ record }: { record: IMedicalRecordModel }) {
  const theme = useTheme()

  const sectionKeys = [
    ...new Set(record.schema.map((field) => field.sectionKey).filter(Boolean)),
  ] as string[]
  const looseFields = fieldsOfSection(record.schema, null)

  function renderFields(fields: typeof record.schema) {
    return fields.map((field) => (
      <View key={field.key} style={styles.field}>
        <Text style={[styles.label, { color: theme.textMute }]}>{field.label.toUpperCase()}</Text>
        <Text style={[styles.value, { color: theme.text }]} testID={`record-view-${field.key}`}>
          {formatFieldValue(field, record.data[field.key])}
        </Text>
      </View>
    ))
  }

  return (
    <View style={styles.wrapper} testID="record-view">
      {/* As chaves saem dos próprios campos, então toda seção tem ao menos
          um — não há caso de cartão vazio a filtrar. */}
      {sectionKeys.map((key) => (
        <Card key={key} testID={`record-view-section-${key}`}>
          {/* O título vem do modelo, que o prontuário salvo não guarda — a
              chave é o que resta. */}
          <CardTitle>{key}</CardTitle>
          {renderFields(fieldsOfSection(record.schema, key))}
        </Card>
      ))}

      {looseFields.length > 0 ? (
        <Card testID="record-view-section-loose">{renderFields(looseFields)}</Card>
      ) : null}

      {record.notes ? (
        <Card testID="record-view-notes">
          <CardTitle>Observações</CardTitle>
          <Text style={[styles.value, { color: theme.text }]}>{record.notes}</Text>
        </Card>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  field: { gap: 2, paddingBottom: 10 },
  label: { fontSize: 10, letterSpacing: 0.5 },
  value: { fontSize: 14 },
})
