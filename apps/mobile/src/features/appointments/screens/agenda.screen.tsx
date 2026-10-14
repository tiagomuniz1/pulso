import { useMemo, useState } from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { UserRole } from '@app/shared'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { AgendaToolbar } from '../components/agenda-toolbar'
import { SlotRow } from '../components/slot-row'
import { useActiveAppointmentLabels, useAgendaProfessionals } from '../hooks/use-agenda-filters.hook'
import { useDayAgenda } from '../hooks/use-day-agenda.hook'
import { addDays, formatToolbarDate, isToday, todayIsoDate } from '../utils/agenda-date.util'

/**
 * A agenda do dia — a grade de horários da web, não uma lista de consultas.
 *
 * A web alterna Dia/Semana e força "dia" abaixo do ponto de quebra do celular;
 * aqui só existe o dia, pelo mesmo motivo: sete colunas não cabem.
 *
 * Quem não gerencia agenda — a recepção — vê a grade igual, mas os horários
 * livres não convidam a nada. Agendar é da fase 5.
 */
export function AgendaScreen() {
  const [date, setDate] = useState(todayIsoDate())
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const router = useRouter()
  const user = useSessionStore((state) => state.user)

  const professionals = useAgendaProfessionals()
  const labels = useActiveAppointmentLabels()

  /**
   * Quem a agenda mostra por padrão.
   *
   * O PROFESSIONAL vê a própria, sem escolher — `'self'` evita que o app
   * precise descobrir o próprio `professionalId` antes de desenhar qualquer
   * coisa. Os outros começam no primeiro da lista, como a web.
   */
  const professionalId = useMemo(() => {
    if (selected) return selected
    if (user?.role === UserRole.PROFESSIONAL) return 'self'
    return professionals.data?.[0]?.id ?? null
  }, [selected, user?.role, professionals.data])

  const { slots, isLoading, isError, refetch } = useDayAgenda(professionalId, date, labelFilter)

  const waitingForProfessional = professionalId === null && professionals.isLoading

  return (
    <Screen testID="agenda-screen">
      <AgendaToolbar
        dateLabel={formatToolbarDate(date)}
        isToday={isToday(date)}
        onPrevious={() => setDate(addDays(date, -1))}
        onToday={() => setDate(todayIsoDate())}
        onNext={() => setDate(addDays(date, 1))}
        professionals={professionals.data ?? []}
        professionalId={professionalId}
        onProfessionalChange={setSelected}
        labels={labels.data?.data ?? []}
        labelFilter={labelFilter}
        onLabelFilterChange={setLabelFilter}
      />

      {waitingForProfessional || isLoading ? <LoadingState testID="agenda-loading" /> : null}

      {!waitingForProfessional && professionalId === null ? (
        <EmptyState
          testID="agenda-empty-professional"
          message="Selecione um profissional para visualizar a agenda."
        />
      ) : null}

      {isError ? (
        <ErrorState
          testID="agenda-error"
          message="Erro ao carregar a agenda. Tente novamente."
          onRetry={refetch}
        />
      ) : null}

      {professionalId !== null && !isLoading && !isError ? (
        <FlatList
          data={slots}
          keyExtractor={(slot, index) => `${slot.startTime}-${index}`}
          contentContainerStyle={styles.list}
          testID="agenda-day-grid"
          ListEmptyComponent={
            // Sob filtro a mensagem padrão mentiria: há horários, só nenhum
            // com o rótulo escolhido.
            labelFilter ? (
              <EmptyState
                testID="agenda-day-empty-filtered"
                message="Nenhuma consulta com este rótulo nesta data."
              />
            ) : (
              <EmptyState
                testID="agenda-day-empty"
                message="Sem horários disponíveis nesta data."
              />
            )
          }
          renderItem={({ item }) => (
            <SlotRow
              slot={item}
              canManage={user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSIONAL}
              isPast={new Date(`${date}T${item.startTime}:00`) < new Date()}
              onPress={(appointmentId) =>
                router.push(`/(app)/appointments/${appointmentId}`)
              }
            />
          )}
        />
      ) : null}

    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 6, flexGrow: 1 },
})
