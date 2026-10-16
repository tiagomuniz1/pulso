import { useMemo, useState } from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { UserRole } from '@app/shared'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { useMyProfessional } from '../../documents/hooks/use-can-issue.hook'
import { AgendaToolbar } from '../components/agenda-toolbar'
import { BookAppointmentSheet } from '../components/book-appointment-sheet'
import { SlotRow } from '../components/slot-row'
import { BlockBanner } from '../../schedule-exceptions/components/block-banner'
import { BlockTimeSheet } from '../../schedule-exceptions/components/block-time-sheet'
import { useScheduleExceptions } from '../../schedule-exceptions/hooks/use-schedule-exceptions.hook'
import { useActiveAppointmentLabels, useAgendaProfessionals } from '../hooks/use-agenda-filters.hook'
import { useDayAgenda } from '../hooks/use-day-agenda.hook'
import { addDays, formatToolbarDate, todayIsoDate } from '../utils/agenda-date.util'
import type { IAgendaSlot } from '@app/core'

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
  const [blocking, setBlocking] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<IAgendaSlot | null>(null)

  const router = useRouter()
  const user = useSessionStore((state) => state.user)

  const professionals = useAgendaProfessionals()
  const labels = useActiveAppointmentLabels()
  const myProfessional = useMyProfessional()

  /**
   * Quem a agenda mostra por padrão.
   *
   * O PROFESSIONAL vê a própria, sem escolher — `'self'` evita que o app
   * precise descobrir o próprio `professionalId` antes de desenhar qualquer
   * coisa.
   *
   * Quem também atende cai na própria agenda, como na web: sem isto um ADMIN
   * com ficha abria a agenda de outra pessoa e tinha que se escolher no
   * seletor toda manhã. Só vale como ponto de partida — a escolha dele tem
   * precedência. Sem ficha, o primeiro da lista.
   */
  const professionalId = useMemo(() => {
    if (selected) return selected
    if (user?.role === UserRole.PROFESSIONAL) return 'self'
    return myProfessional?.id ?? professionals.data?.[0]?.id ?? null
  }, [selected, user?.role, myProfessional?.id, professionals.data])

  const { slots, isLoading, isError, refetch } = useDayAgenda(professionalId, date, labelFilter)
  const exceptions = useScheduleExceptions(professionalId, date)
  // Derivado uma vez: durante o carregamento `data` é mesmo `undefined`, e
  // dizê-lo no meio do JSX cria um ramo que só o primeiro render exercita.
  const blocks = exceptions.data ?? []

  const waitingForProfessional = professionalId === null && professionals.isLoading
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSIONAL
  /**
   * Quem o agendamento e o bloqueio usam.
   *
   * Para o PROFESSIONAL fica indefinido de propósito: o servidor usa a ficha
   * dele, e mandar `'self'` como id seria mandar uma string que não é um id.
   */
  const scopedProfessionalId = professionalId === 'self' ? undefined : (professionalId ?? undefined)

  return (
    <Screen testID="agenda-screen">
      <AgendaToolbar
        dateLabel={formatToolbarDate(date)}
        onPrevious={() => setDate(addDays(date, -1))}
        onToday={() => setDate(todayIsoDate())}
        onNext={() => setDate(addDays(date, 1))}
        professionals={professionals.data ?? []}
        professionalId={professionalId}
        onProfessionalChange={setSelected}
        labels={labels.data?.data ?? []}
        labelFilter={labelFilter}
        onLabelFilterChange={setLabelFilter}
        onBlockTime={() => setBlocking(true)}
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
          // Os bloqueios encabeçam a grade, como na web: sem eles um dia de
          // férias parece "sem agenda cadastrada".
          ListHeaderComponent={
            <>
              {blocks.map((exception) => (
                <BlockBanner key={exception.id} exception={exception} canManage={canManage} />
              ))}
            </>
          }
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
              canManage={canManage}
              isPast={new Date(`${date}T${item.startTime}:00`) < new Date()}
              onPress={(appointmentId) => router.push(`/(app)/appointments/${appointmentId}`)}
              onBook={() => setBookingSlot(item)}
            />
          )}
        />
      ) : null}

      {blocking ? (
        <BlockTimeSheet
          isOpen
          onClose={() => setBlocking(false)}
          date={date}
          isAdmin={user?.role === UserRole.ADMIN}
          professionalId={scopedProfessionalId}
        />
      ) : null}

      {bookingSlot ? (
        <BookAppointmentSheet
          isOpen
          onClose={() => setBookingSlot(null)}
          date={date}
          startTime={bookingSlot.startTime}
          endTime={bookingSlot.endTime}
          professionalId={scopedProfessionalId}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 6, flexGrow: 1 },
})
