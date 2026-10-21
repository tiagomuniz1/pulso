import { StyleSheet, Text, View } from 'react-native'
import { MEDICAL_RECORD_FIELD_TYPE_LABELS } from '@app/shared'
import {
  professionLabel,
  specialtyLabel,
  type ITemplateFieldModel,
  type ITemplateModel,
} from '@app/core'
import { Badge } from '../../../components/ui/list-screen'
import { useTheme } from '../../../theme/theme-context'

/**
 * Um campo do modelo, como ele aparece para quem só quer conferir.
 *
 * "Canônico" e "Obrigatório" são selos porque é o que distingue um campo do
 * outro de relance — o resto é texto de apoio.
 */
function FieldCard({ field, testID }: { field: ITemplateFieldModel; testID: string }) {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.field,
        { borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: theme.radius.md },
      ]}
      testID={testID}
    >
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}</Text>
        <View style={styles.badges}>
          {field.canonical ? <Badge label="Canônico" tone="accent" /> : null}
          {field.required ? <Badge label="Obrigatório" tone="danger" /> : null}
        </View>
      </View>
      <Text style={[styles.fieldType, { color: theme.textMute }]}>
        {MEDICAL_RECORD_FIELD_TYPE_LABELS[field.type]}
        {field.canonicalKey ? ` · ${field.canonicalKey}` : ''}
      </Text>
      {field.options && field.options.length > 0 ? (
        <View style={styles.options}>
          {field.options.map((option) => (
            <View
              key={option.value}
              style={[styles.option, { backgroundColor: theme.line, borderRadius: theme.radius.sm }]}
            >
              <Text style={{ color: theme.textDim, fontSize: 12 }}>{option.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** O modelo inteiro em leitura: cabeçalho, campos gerais e as seções. */
export function TemplateDetails({ template }: { template: ITemplateModel }) {
  const theme = useTheme()

  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order
  const flatFields = template.fields.filter((field) => !field.sectionKey).sort(byOrder)
  const sections = [...template.sections].sort(byOrder)

  return (
    <View style={styles.wrapper} testID="template-details">
      <Text style={[styles.name, { color: theme.text }]} testID="template-details-name">
        {template.name}
      </Text>
      <Text style={[styles.meta, { color: theme.textDim }]} testID="template-details-profession">
        Profissão: {professionLabel(template)}
      </Text>
      <Text style={[styles.meta, { color: theme.textDim }]} testID="template-details-specialty">
        Especialidade: {specialtyLabel(template)}
      </Text>
      <View style={styles.status}>
        <Badge
          label={template.isActive ? 'Ativo' : 'Inativo'}
          tone={template.isActive ? 'good' : 'danger'}
          testID="template-details-status"
        />
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>
        Campos ({template.fields.length})
      </Text>

      {template.fields.length === 0 ? (
        <Text style={{ color: theme.textMute, fontSize: 13 }} testID="template-details-no-fields">
          Este modelo não possui campos.
        </Text>
      ) : null}

      {flatFields.map((field, index) => (
        <FieldCard
          key={field.key ?? index}
          field={field}
          testID={`template-details-field-${index}`}
        />
      ))}

      {sections.map((section, sectionIndex) => (
        <View
          key={section.key}
          style={[styles.section, { borderColor: theme.line, borderRadius: theme.radius.lg }]}
          testID={`template-details-section-${sectionIndex}`}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.text }]}
            testID={`template-details-section-title-${sectionIndex}`}
          >
            {section.title}
          </Text>
          {template.fields.filter((field) => field.sectionKey === section.key).length === 0 ? (
            <Text
              style={{ color: theme.textMute, fontSize: 12 }}
              testID={`template-details-section-empty-${sectionIndex}`}
            >
              Nenhum campo nesta seção.
            </Text>
          ) : (
            template.fields
              .filter((field) => field.sectionKey === section.key)
              .sort(byOrder)
              .map((field, index) => (
                <FieldCard
                  key={field.key ?? index}
                  field={field}
                  testID={`template-details-section-${sectionIndex}-field-${index}`}
                />
              ))
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 13 },
  status: { flexDirection: 'row', marginTop: 4 },
  heading: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  field: { borderWidth: 1, padding: 12, gap: 6 },
  fieldHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  fieldLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 6 },
  fieldType: { fontSize: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: { paddingHorizontal: 8, paddingVertical: 2 },
  section: { borderWidth: 1, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
})
