import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MEDICAL_RECORD_FIELD_TYPE_LABELS } from '@app/shared'
import type { ICanonicalFieldModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { useCanonicalFields } from '../hooks/use-medical-record-templates.hook'

/**
 * O catálogo canônico da plataforma, para adotar num modelo.
 *
 * **Global, sem segmentação**: todo campo vale para qualquer profissão. O
 * campo já teve escopo por especialidade, o que só limitava — template é
 * escopado por especialidade **ou** por conselho, e o campo só podia sê-lo
 * por especialidade.
 */
export function CanonicalFieldPicker({
  onAdopt,
  testID,
}: {
  onAdopt: (field: ICanonicalFieldModel) => void
  testID: string
}) {
  const theme = useTheme()
  const { data: fields, isPending, isError } = useCanonicalFields()

  if (isPending) {
    return (
      <Text style={{ color: theme.textMute, fontSize: 13 }} testID={`${testID}-loading`}>
        Carregando campos canônicos...
      </Text>
    )
  }

  if (isError) {
    return (
      <Text style={{ color: theme.danger, fontSize: 13 }} testID={`${testID}-error`}>
        Não foi possível carregar os campos canônicos.
      </Text>
    )
  }

  if (!fields || fields.length === 0) {
    return (
      <Text style={{ color: theme.textMute, fontSize: 13 }} testID={`${testID}-empty`}>
        Nenhum campo canônico disponível.
      </Text>
    )
  }

  return (
    <View style={styles.list} testID={testID}>
      {fields.map((field) => (
        <View
          key={field.id}
          style={[
            styles.item,
            { borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: theme.radius.md },
          ]}
          testID={`${testID}-item-${field.id}`}
        >
          <View style={styles.itemText}>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{field.label}</Text>
            <Text style={{ color: theme.textMute, fontSize: 12 }}>
              {MEDICAL_RECORD_FIELD_TYPE_LABELS[field.type]} · {field.canonicalKey}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => onAdopt(field)}
            testID={`${testID}-adopt-${field.id}`}
          >
            <Text style={{ color: theme.accent, fontWeight: '600' }}>Adotar</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemText: { flex: 1, gap: 2 },
})
