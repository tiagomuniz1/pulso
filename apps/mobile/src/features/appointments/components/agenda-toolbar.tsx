import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { APPOINTMENT_LABEL_COLOR_HEX } from '@app/shared'
import type { IAppointmentLabelModel, IProfessionalModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { withAlpha } from '../utils/color.util'

/**
 * A barra da agenda, na ordem da web.
 *
 * O alternador Dia/Semana não vem: na web ele é `hidden sm:flex` e o
 * `useIsMobile` força a visão "dia" abaixo desse ponto — a semana em sete
 * colunas não cabe num celular, e é por isso que a web já desiste dela.
 *
 * "Bloquear horário" também não: depende de `schedule-exceptions`, que ainda
 * não foi portado. Esconder é melhor do que um botão que não faz nada.
 */
export function AgendaToolbar({
  dateLabel,
  isToday,
  onPrevious,
  onToday,
  onNext,
  professionals,
  professionalId,
  onProfessionalChange,
  labels,
  labelFilter,
  onLabelFilterChange,
}: {
  dateLabel: string
  isToday: boolean
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
  professionals: IProfessionalModel[]
  professionalId: string | null
  onProfessionalChange: (id: string) => void
  labels: IAppointmentLabelModel[]
  labelFilter: string | null
  onLabelFilterChange: (id: string | null) => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.toolbar} testID="agenda-toolbar">
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anterior"
          onPress={onPrevious}
          testID="toolbar-prev"
          style={[styles.navButton, { borderRadius: theme.radius.md }]}
        >
          <Text style={[styles.navArrow, { color: theme.accent }]}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onToday}
          testID="toolbar-today"
          style={[
            styles.todayButton,
            { borderRadius: theme.radius.md, backgroundColor: isToday ? theme.accentSoft : 'transparent' },
          ]}
        >
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>Hoje</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo"
          onPress={onNext}
          testID="toolbar-next"
          style={[styles.navButton, { borderRadius: theme.radius.md }]}
        >
          <Text style={[styles.navArrow, { color: theme.accent }]}>›</Text>
        </Pressable>
        <Text style={[styles.dateLabel, { color: theme.text }]} testID="toolbar-date-label">
          {dateLabel}
        </Text>
      </View>

      {professionals.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          testID="toolbar-professional-selector"
        >
          {professionals.map((professional) => {
            const isOn = professional.id === professionalId
            return (
              <Pressable
                key={professional.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: isOn }}
                onPress={() => onProfessionalChange(professional.id)}
                testID={`toolbar-professional-${professional.id}`}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.xl,
                    borderColor: isOn ? theme.accent : theme.line,
                    backgroundColor: isOn ? theme.accentSoft : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: isOn ? theme.accent : theme.textDim, fontSize: 13 }}>
                  {professional.user.fullName}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}

      {labels.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          testID="agenda-label-legend"
        >
          <Text style={[styles.legendLabel, { color: theme.textMute }]}>Rótulos:</Text>
          {labels.map((label) => {
            const palette = APPOINTMENT_LABEL_COLOR_HEX[label.color][theme.isDark ? 'dark' : 'light']
            const isOn = labelFilter === label.id
            return (
              <Pressable
                key={label.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn }}
                onPress={() => onLabelFilterChange(isOn ? null : label.id)}
                testID={`agenda-label-${label.id}`}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.xl,
                    borderColor: palette.base,
                    backgroundColor: isOn ? palette.base : palette.soft,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isOn ? withAlpha(theme.surface, 100) : palette.base,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {label.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: { gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 24, lineHeight: 28 },
  todayButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center' },
  dateLabel: { flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  chip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  legendLabel: { fontSize: 12 },
})
