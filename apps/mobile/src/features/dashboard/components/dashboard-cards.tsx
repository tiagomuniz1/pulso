import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import type { IDashboardModel } from '@app/core'
import { TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import { paletteColor } from '../utils/chart-geometry.util'
import { AreaLineChart, DonutChart } from './charts'

/** Um número grande com rótulo e ícone — o KPI do topo. */
function KpiCard({
  label,
  value,
  icon,
  tone = 'neutral',
  testID,
}: {
  label: string
  value: number
  icon: keyof typeof Feather.glyphMap
  tone?: 'neutral' | 'good' | 'danger'
  testID: string
}) {
  const theme = useTheme()
  const palette = {
    neutral: { border: theme.line, background: theme.surface, text: theme.text },
    good: { border: theme.good, background: theme.goodSoft, text: theme.good },
    danger: { border: theme.danger, background: theme.dangerSoft, text: theme.danger },
  }[tone]

  return (
    <View
      style={[
        styles.kpi,
        { borderColor: palette.border, backgroundColor: palette.background, borderRadius: theme.radius.lg },
      ]}
      testID={testID}
    >
      <View style={styles.kpiHeader}>
        <Text style={[styles.kpiLabel, { color: theme.textDim }]}>{label}</Text>
        <Feather name={icon} size={18} color={palette.text} />
      </View>
      <Text style={[styles.kpiValue, { color: palette.text }]}>{value}</Text>
    </View>
  )
}

export function DashboardKpiRow({ kpi }: { kpi: IDashboardModel['kpi'] }) {
  return (
    <View style={styles.kpiRow}>
      <KpiCard label="Agendados" value={kpi.scheduled} icon="calendar" testID="dashboard-kpi-scheduled" />
      <KpiCard label="Confirmados" value={kpi.confirmed} icon="clock" testID="dashboard-kpi-confirmed" />
      <KpiCard
        label="Atendidos"
        value={kpi.completed}
        icon="check-circle"
        tone="good"
        testID="dashboard-kpi-completed"
      />
      <KpiCard
        label="Faltaram"
        value={kpi.noShow}
        icon="x-circle"
        tone="danger"
        testID="dashboard-kpi-no-show"
      />
    </View>
  )
}

/** O quadro de um gráfico: título e, dentro, o desenho ou o aviso de vazio. */
function ChartCard({
  title,
  testID,
  children,
}: {
  title: string
  testID: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <View
      style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface, borderRadius: theme.radius.lg }]}
      testID={testID}
    >
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  )
}

function EmptyChart({ message, testID }: { message: string; testID: string }) {
  const theme = useTheme()
  return (
    <Text style={[styles.empty, { color: theme.textMute }]} testID={testID}>
      {message}
    </Text>
  )
}

function LegendRow({
  label,
  value,
  color,
  testID,
}: {
  label: string
  value: number
  color: string
  testID?: string
}) {
  const theme = useTheme()
  return (
    <View style={styles.legendRow} testID={testID}>
      <View style={styles.legendLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.legendText, { color: theme.textDim }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.legendValue, { color: theme.text }]}>{value}</Text>
    </View>
  )
}

export function PatientsCard({ patients }: { patients: IDashboardModel['patients'] }) {
  const theme = useTheme()

  return (
    <ChartCard title="Pacientes" testID="dashboard-patients-chart">
      {patients.total > 0 ? (
        <DonutChart
          values={[
            { value: patients.newPatients, color: paletteColor(0) },
            { value: patients.returningPatients, color: '#93c5fd' },
          ]}
          testID="dashboard-patients-donut"
        />
      ) : (
        <EmptyChart message="Sem dados no período" testID="dashboard-patients-empty" />
      )}

      <LegendRow label="Novos" value={patients.newPatients} color={paletteColor(0)} />
      <LegendRow label="Recorrentes" value={patients.returningPatients} color="#93c5fd" />

      <View style={[styles.footer, { borderColor: theme.line }]}>
        <Text style={[styles.footerText, { color: theme.textDim }]}>
          ♂ Homens <Text style={{ color: theme.text, fontWeight: '700' }}>{patients.byGender.male}</Text>
        </Text>
        <Text style={[styles.footerText, { color: theme.textDim }]}>
          ♀ Mulheres <Text style={{ color: theme.text, fontWeight: '700' }}>{patients.byGender.female}</Text>
        </Text>
        <Text style={[styles.footerText, { color: theme.textDim }]}>
          Total <Text style={{ color: theme.text, fontWeight: '700' }}>{patients.total}</Text>
        </Text>
      </View>
    </ChartCard>
  )
}

/**
 * Procedimentos realizados.
 *
 * A legenda mostra os quatro primeiros, como na web: a rosca já diz a
 * proporção, e uma lista de vinte especialidades empurraria o resto do
 * painel para fora da tela.
 */
export function ProceduresCard({ procedures }: { procedures: IDashboardModel['procedures'] }) {
  return (
    <ChartCard title="Procedimentos realizados" testID="dashboard-procedures-chart">
      {procedures.total > 0 ? (
        <DonutChart
          values={procedures.items.map((item, index) => ({
            value: item.value,
            color: paletteColor(index),
          }))}
          center={String(procedures.total)}
          testID="dashboard-procedures-donut"
        />
      ) : (
        <EmptyChart message="Sem procedimentos no período" testID="dashboard-procedures-empty" />
      )}

      {procedures.items.slice(0, 4).map((item, index) => (
        <LegendRow
          key={item.label}
          label={item.label}
          value={item.value}
          color={paletteColor(index)}
          testID={`dashboard-procedures-item-${index}`}
        />
      ))}
    </ChartCard>
  )
}

export function InsuranceCard({ insurance }: { insurance: IDashboardModel['insurance'] }) {
  return (
    <ChartCard title="Pacientes x Convênio" testID="dashboard-insurance-chart">
      {insurance.total > 0 ? (
        <DonutChart
          values={[
            { value: insurance.particular, color: paletteColor(0) },
            { value: insurance.convenio, color: paletteColor(1) },
          ]}
          center={String(insurance.total)}
          testID="dashboard-insurance-donut"
        />
      ) : (
        <EmptyChart message="Sem dados de convênio" testID="dashboard-insurance-empty" />
      )}

      <LegendRow label="Particular" value={insurance.particular} color={paletteColor(0)} />
      <LegendRow label="Convênio" value={insurance.convenio} color={paletteColor(1)} />
    </ChartCard>
  )
}

const BIRTHDAY_PAGE_SIZE = 5

/**
 * Aniversariantes do dia.
 *
 * Mostra cinco e abre o resto numa lista com busca, como a web faz num
 * modal — numa clínica grande o dia tem dezenas, e cinco é o que cabe sem
 * empurrar os gráficos para baixo.
 */
export function BirthdayPanel({
  todayBirthdays,
}: {
  todayBirthdays: IDashboardModel['todayBirthdays']
}) {
  const theme = useTheme()
  const [isExpanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const hasMore = todayBirthdays.length > BIRTHDAY_PAGE_SIZE
  const filtered = todayBirthdays.filter((birthday) =>
    birthday.fullName.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const visible = isExpanded ? filtered : todayBirthdays.slice(0, BIRTHDAY_PAGE_SIZE)

  return (
    <ChartCard title="Aniversariantes do dia 🎂" testID="dashboard-birthdays">
      {todayBirthdays.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="dashboard-birthdays-empty">
          Nenhum aniversariante hoje.
        </Text>
      ) : null}

      {isExpanded ? (
        <TextField
          label="Filtrar por nome"
          value={search}
          onChange={setSearch}
          placeholder="Filtrar por nome..."
          testID="dashboard-birthdays-search"
        />
      ) : null}

      {isExpanded && filtered.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="dashboard-birthdays-no-result">
          Nenhum resultado.
        </Text>
      ) : null}

      {visible.map((birthday) => (
        <View
          key={birthday.patientId}
          style={styles.birthdayRow}
          testID={`dashboard-birthday-${birthday.patientId}`}
        >
          <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={1}>
            {birthday.fullName}
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 12 }}>{birthday.age} anos</Text>
        </View>
      ))}

      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => setExpanded((current) => !current)}
          testID="dashboard-birthdays-toggle"
        >
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>
            {isExpanded ? 'Ver menos' : `Ver mais (${todayBirthdays.length})`}
          </Text>
        </Pressable>
      ) : null}
    </ChartCard>
  )
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function TimelineCard({
  appointmentsByDay,
}: {
  appointmentsByDay: IDashboardModel['appointmentsByDay']
}) {
  return (
    <ChartCard title="Atendimentos no período" testID="dashboard-timeline-chart">
      {appointmentsByDay.length > 0 ? (
        <AreaLineChart
          values={appointmentsByDay.map((day) => day.count)}
          labels={appointmentsByDay.map((day) => shortDate(day.date))}
          color={paletteColor(0)}
          testID="dashboard-timeline-line"
        />
      ) : (
        <EmptyChart message="Sem atendimentos no período" testID="dashboard-timeline-empty" />
      )}
    </ChartCard>
  )
}

export function AgeDistributionCard({
  ageDistribution,
}: {
  ageDistribution: IDashboardModel['ageDistribution']
}) {
  return (
    <ChartCard title="Distribuição etária" testID="dashboard-age-distribution">
      {ageDistribution.length > 0 ? (
        <AreaLineChart
          values={ageDistribution.map((entry) => entry.count)}
          labels={ageDistribution.map((entry) => String(entry.age))}
          color={paletteColor(1)}
          testID="dashboard-age-line"
        />
      ) : (
        <EmptyChart
          message="Sem dados de distribuição etária"
          testID="dashboard-age-empty"
        />
      )}
    </ChartCard>
  )
}

const styles = StyleSheet.create({
  kpiRow: { gap: 12 },
  kpi: { borderWidth: 1, padding: 16, gap: 8 },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiLabel: { fontSize: 13 },
  kpiValue: { fontSize: 28, fontWeight: '700' },
  card: { borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  legendText: { fontSize: 12, flexShrink: 1 },
  legendValue: { fontSize: 12, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8, gap: 8 },
  footerText: { fontSize: 11 },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
})
