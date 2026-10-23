import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  APPOINTMENT_LABEL_COLOR_HEX,
  APPOINTMENT_LABEL_COLOR_LABELS,
  APPOINTMENT_LABEL_COLOR_ORDER,
  type AppointmentLabelColor,
} from '@app/shared'
import { useTheme } from '../../../theme/theme-context'

/**
 * A paleta curada de dezesseis, como amostras de cor.
 *
 * **A cor não é livre**, e é por isso que o seletor é uma grade e não um
 * campo: o banco guarda o identificador, nunca um hex. Hex não tem variante
 * para modo escuro, e as cores vivem fora do alcance do tema da clínica —
 * é o que impede a faixa de brigar com a marca.
 */
export function LabelColorPicker({
  value,
  onChange,
  error,
  testID,
}: {
  value: AppointmentLabelColor | null
  onChange: (color: AppointmentLabelColor) => void
  error?: string | null
  testID: string
}) {
  const theme = useTheme()
  const variant = theme.isDark ? 'dark' : 'light'

  return (
    <View style={styles.field} testID={testID}>
      <Text style={[styles.label, { color: theme.text }]}>
        Cor <Text style={{ color: theme.danger }}>*</Text>
      </Text>

      <View style={styles.grid}>
        {APPOINTMENT_LABEL_COLOR_ORDER.map((color) => {
          const palette = APPOINTMENT_LABEL_COLOR_HEX[color][variant]
          const isOn = value === color
          return (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={APPOINTMENT_LABEL_COLOR_LABELS[color]}
              onPress={() => onChange(color)}
              testID={`${testID}-${color}`}
              style={[
                styles.swatch,
                {
                  backgroundColor: palette.soft,
                  borderColor: isOn ? palette.base : theme.line,
                  borderWidth: isOn ? 2 : 1,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <View style={[styles.strip, { backgroundColor: palette.base }]} />
              <Text style={[styles.swatchLabel, { color: palette.base }]} numberOfLines={1}>
                {APPOINTMENT_LABEL_COLOR_LABELS[color]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {error ? (
        <Text style={[styles.error, { color: theme.danger }]} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  strip: { width: 4, height: 16, borderRadius: 2 },
  swatchLabel: { fontSize: 12, fontWeight: '600' },
  error: { fontSize: 12 },
})
