import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { IDashboardFilters } from '@app/core'
import { TextField } from '../../../components/ui/fields'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { applyDateMask, fromIsoDate, toIsoDate } from '../../../lib/date-input'
import { useTheme } from '../../../theme/theme-context'
import {
  AgeDistributionCard,
  BirthdayPanel,
  DashboardKpiRow,
  InsuranceCard,
  PatientsCard,
  ProceduresCard,
  TimelineCard,
} from '../components/dashboard-cards'
import { useDashboardStats } from '../hooks/use-dashboard-stats.hook'
import { defaultDateRange, toApiDate } from '../utils/chart-geometry.util'

/**
 * Os números da clínica no período.
 *
 * As datas são campos com máscara, como no resto do app — a web usa
 * `<input type="date">`, que no navegador do celular abre o seletor do
 * sistema, e um app com dois jeitos de pedir data é pior do que um com um
 * jeito só (ver `lib/date-input.ts`).
 *
 * **Data incompleta não dispara consulta.** A cada dígito o texto é uma
 * data diferente, e aceitar a parcial pediria ao servidor trinta períodos
 * que ninguém quis ver.
 */
export function DashboardScreen() {
  const theme = useTheme()
  const initial = defaultDateRange(new Date())

  const [fromText, setFromText] = useState(fromIsoDate(initial.from))
  const [toText, setToText] = useState(fromIsoDate(initial.to))
  const [filters, setFilters] = useState<IDashboardFilters>({
    from: toApiDate(initial.from),
    to: toApiDate(initial.to),
  })

  const { data, isPending, isError, refetch } = useDashboardStats(filters)

  function changeFrom(value: string) {
    const masked = applyDateMask(value)
    setFromText(masked)
    const iso = toIsoDate(masked)
    if (iso) setFilters((current) => ({ ...current, from: iso }))
  }

  function changeTo(value: string) {
    const masked = applyDateMask(value)
    setToText(masked)
    const iso = toIsoDate(masked)
    if (iso) setFilters((current) => ({ ...current, to: iso }))
  }

  return (
    <Screen testID="dashboard-screen">
      <ScreenScroll testID="dashboard">
        <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>

        <View style={styles.range} testID="dashboard-date-range">
          <View style={styles.rangeField}>
            <TextField
              label="De"
              value={fromText}
              onChange={changeFrom}
              keyboardType="numeric"
              placeholder="dd/mm/aaaa"
              testID="dashboard-date-from"
            />
          </View>
          <View style={styles.rangeField}>
            <TextField
              label="Até"
              value={toText}
              onChange={changeTo}
              keyboardType="numeric"
              placeholder="dd/mm/aaaa"
              testID="dashboard-date-to"
            />
          </View>
        </View>

        {isPending ? <LoadingState testID="dashboard-loading" /> : null}

        {isError ? (
          <ErrorState
            testID="dashboard-error"
            message="Não foi possível carregar os dados do dashboard."
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isPending && !isError && data ? (
          <View style={styles.content}>
            <DashboardKpiRow kpi={data.kpi} />
            <PatientsCard patients={data.patients} />
            <ProceduresCard procedures={data.procedures} />
            <InsuranceCard insurance={data.insurance} />
            <BirthdayPanel todayBirthdays={data.todayBirthdays} />
            <TimelineCard appointmentsByDay={data.appointmentsByDay} />
            <AgeDistributionCard ageDistribution={data.ageDistribution} />
          </View>
        ) : null}
      </ScreenScroll>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700' },
  range: { flexDirection: 'row', gap: 12, marginTop: 12 },
  rangeField: { flex: 1 },
  content: { gap: 12, marginTop: 12 },
})
