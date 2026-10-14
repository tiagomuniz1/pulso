import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { APPOINTMENT_LABEL_COLOR_HEX } from '@app/shared'
import type { IAppointmentLabelModel, IProfessionalModel } from '@app/core'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'

/**
 * A barra da agenda, na ordem exata da web em largura de celular:
 *
 *   ‹ Hoje ›
 *   Quinta-feira, 15 de outubro de 2026
 *   [ Selecione um profissional        ⌄ ]
 *   [ Todos os rótulos                 ⌄ ]
 *   [        Bloquear horário            ]
 *   Rótulos: (pastilhas, rolagem horizontal)
 *
 * O alternador Dia/Semana não vem porque a web o esconde aqui
 * (`hidden sm:flex`) e força a visão de dia — sete colunas não cabem.
 *
 * As pastilhas coloridas no fim são **legenda**, não filtro: quem filtra é o
 * select acima. Confundi as duas coisas na primeira versão e virei a lista de
 * profissionais em pastilhas também — numa clínica com dezenas delas isso é
 * uma faixa rolável que esconde quem está fora da tela.
 */
export function AgendaToolbar({
  dateLabel,
  onPrevious,
  onToday,
  onNext,
  professionals,
  professionalId,
  onProfessionalChange,
  labels,
  labelFilter,
  onLabelFilterChange,
  onBlockTime,
}: {
  dateLabel: string
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
  professionals: IProfessionalModel[]
  professionalId: string | null
  onProfessionalChange: (id: string) => void
  labels: IAppointmentLabelModel[]
  labelFilter: string | null
  onLabelFilterChange: (id: string | null) => void
  onBlockTime: () => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.toolbar} testID="agenda-toolbar">
      <Text style={[styles.title, { color: theme.text }]}>Consultas</Text>

      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Anterior"
          onPress={onPrevious}
          testID="toolbar-prev"
          style={[styles.navButton, { borderRadius: theme.radius.xl, borderColor: theme.line }]}
        >
          <Text style={[styles.navArrow, { color: theme.textDim }]}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onToday}
          testID="toolbar-today"
          style={[styles.todayButton, { borderRadius: theme.radius.xl, borderColor: theme.line }]}
        >
          <Text style={{ color: theme.text, fontSize: 13 }}>Hoje</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo"
          onPress={onNext}
          testID="toolbar-next"
          style={[styles.navButton, { borderRadius: theme.radius.xl, borderColor: theme.line }]}
        >
          <Text style={[styles.navArrow, { color: theme.textDim }]}>›</Text>
        </Pressable>
      </View>

      <Text style={[styles.dateLabel, { color: theme.text }]} testID="toolbar-date-label">
        {dateLabel}
      </Text>

      <SelectField
        value={professionalId}
        options={professionals.map((professional) => ({
          value: professional.id,
          label: professional.user.fullName,
        }))}
        onChange={onProfessionalChange}
        placeholder="Selecione um profissional"
        testID="toolbar-professional-select"
      />

      <SelectField
        value={labelFilter ?? ''}
        options={[
          { value: '', label: 'Todos os rótulos' },
          // A web oferece "Sem rótulo" como opção do mesmo select — é o
          // recorte que a recepção usa para achar o que ninguém classificou.
          { value: 'none', label: 'Sem rótulo' },
          ...labels.map((label) => ({ value: label.id, label: label.name })),
        ]}
        onChange={(value) => onLabelFilterChange(value === '' ? null : value)}
        placeholder="Todos os rótulos"
        testID="toolbar-label-select"
      />

      <Pressable
        accessibilityRole="button"
        onPress={onBlockTime}
        testID="toolbar-block-time"
        style={[styles.blockButton, { borderRadius: theme.radius.md, borderColor: theme.line }]}
      >
        <Text style={{ color: theme.text, fontSize: 14 }}>Bloquear horário</Text>
      </Pressable>

      {labels.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legend}
          testID="agenda-label-legend"
        >
          <Text style={[styles.legendLabel, { color: theme.textMute }]}>Rótulos:</Text>
          {labels.map((label) => {
            const palette = APPOINTMENT_LABEL_COLOR_HEX[label.color][theme.isDark ? 'dark' : 'light']
            return (
              <View
                key={label.id}
                style={[
                  styles.pill,
                  { borderRadius: theme.radius.xl, backgroundColor: palette.soft },
                ]}
                testID={`agenda-label-legend-item-${label.id}`}
              >
                <Text style={{ color: palette.base, fontSize: 12, fontWeight: '600' }}>
                  {label.name}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: { gap: 12, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '600' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 18, lineHeight: 20 },
  todayButton: {
    height: 32,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { fontSize: 14, fontWeight: '500' },
  blockButton: { borderWidth: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 24 },
  legendLabel: { fontSize: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4 },
})
