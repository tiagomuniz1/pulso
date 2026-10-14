import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { useTheme } from '../../../theme/theme-context'
import { AppointmentRow } from '../components/appointment-row'
import { useDayAppointments } from '../hooks/use-day-appointments.hook'
import { addDays, formatAgendaDate, isToday, todayIsoDate } from '../utils/agenda-date.util'

/**
 * A fila do dia.
 *
 * É a tela inicial porque é a pergunta que a profissional faz ao desbloquear
 * o celular entre uma paciente e outra: quem é a próxima. Por isso abre em
 * hoje, e por isso "Hoje" só aparece quando se saiu dele — um atalho para
 * voltar de onde a navegação levou.
 */
export function AgendaScreen() {
  const [date, setDate] = useState(todayIsoDate())
  const theme = useTheme()
  const router = useRouter()
  const user = useSessionStore((state) => state.user)
  const { data, isLoading, isError, refetch } = useDayAppointments(date)

  return (
    <Screen testID="agenda-screen">
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.textDim }]} numberOfLines={1}>
          {user?.fullName ?? ''}
        </Text>
        <View style={styles.nav}>
          <Pressable
            accessibilityLabel="Dia anterior"
            accessibilityRole="button"
            onPress={() => setDate(addDays(date, -1))}
            style={[styles.navButton, { borderRadius: theme.radius.md }]}
            testID="agenda-previous-day"
          >
            <Text style={[styles.navArrow, { color: theme.accent }]}>‹</Text>
          </Pressable>
          <Text style={[styles.date, { color: theme.accent }]} testID="agenda-date">
            {formatAgendaDate(date)}
          </Text>
          <Pressable
            accessibilityLabel="Próximo dia"
            accessibilityRole="button"
            onPress={() => setDate(addDays(date, 1))}
            style={[styles.navButton, { borderRadius: theme.radius.md }]}
            testID="agenda-next-day"
          >
            <Text style={[styles.navArrow, { color: theme.accent }]}>›</Text>
          </Pressable>
        </View>
        {isToday(date) ? null : (
          <Pressable onPress={() => setDate(todayIsoDate())} testID="agenda-today">
            <Text style={[styles.today, { color: theme.accent }]}>Voltar para hoje</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? <LoadingState testID="agenda-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="agenda-error"
          message="Não foi possível carregar a agenda."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          testID="agenda-list"
          ListEmptyComponent={
            <EmptyState testID="agenda-empty" message="Nenhuma consulta neste dia." />
          }
          renderItem={({ item }) => (
            <AppointmentRow
              appointment={item}
              onPress={() => router.push(`/(app)/appointments/${item.id}`)}
            />
          )}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  greeting: { fontSize: 13 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 28, lineHeight: 32 },
  date: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  today: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  list: { padding: 16, paddingTop: 0, gap: 10, flexGrow: 1 },
})
