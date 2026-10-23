import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { DayOfWeek, UserRole } from '@app/shared'
import { DAY_OF_WEEK_LABELS, type IScheduleModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ChoiceField } from '../../../components/ui/fields'
import { ListHeader, SuccessBanner } from '../../../components/ui/list-screen'
import { SelectField } from '../../../components/ui/select-field'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { useAgendaProfessionals } from '../../appointments/hooks/use-agenda-filters.hook'
import { ScheduleCard } from '../components/schedule-card'
import { useDeleteSchedule, useSchedules } from '../hooks/use-schedules.hook'

const TODOS = '__todos__'

/**
 * A lista de agendas.
 *
 * **O PROFESSIONAL recebe só as próprias** — recorte do servidor — e por
 * isso o seletor de profissional não lhe é oferecido: escolher outro
 * devolveria lista vazia sem explicação. A recepção não chega aqui; agenda
 * não está no menu dela.
 */
export function ScheduleListScreen() {
  const router = useRouter()
  const role = useSessionStore((state) => state.user?.role)
  const isAdmin = role === UserRole.ADMIN

  const [professionalId, setProfessionalId] = useState(TODOS)
  const [dayOfWeek, setDayOfWeek] = useState(TODOS)
  const [includeExpired, setIncludeExpired] = useState(false)
  const [toDelete, setToDelete] = useState<IScheduleModel | null>(null)
  const [deleted, setDeleted] = useState<string | null>(null)

  const professionals = useAgendaProfessionals()

  const params = {
    professionalId: professionalId === TODOS ? undefined : professionalId,
    dayOfWeek: dayOfWeek === TODOS ? undefined : (dayOfWeek as DayOfWeek),
    includeExpired: includeExpired ? true : undefined,
  }
  const { data, isPending, isError, refetch } = useSchedules(params)
  const remove = useDeleteSchedule()

  function confirmDelete(schedule: IScheduleModel) {
    remove.mutate(schedule.id, {
      onSuccess: () => {
        setToDelete(null)
        setDeleted(`Agenda de ${schedule.professionalName} excluída com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const schedules = data?.data ?? []
  const total = data?.total ?? 0
  const hasFilter = professionalId !== TODOS || dayOfWeek !== TODOS

  return (
    <Screen testID="schedule-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="schedule-list-header"
          title="Agendas"
          subtitle={
            isPending || isError
              ? null
              : total === 1
                ? '1 agenda encontrada'
                : `${total} agendas encontradas`
          }
          action={{
            label: '+ Nova agenda',
            onPress: () => router.push('/(app)/schedules/new'),
            testID: 'schedule-list-new',
          }}
        />

        {isAdmin ? (
          <SelectField
            value={professionalId}
            placeholder="Todos os profissionais"
            testID="schedule-list-professional"
            options={[
              { value: TODOS, label: 'Todos os profissionais' },
              ...(professionals.data ?? []).map((professional) => ({
                value: professional.id,
                label: professional.user.fullName,
              })),
            ]}
            onChange={setProfessionalId}
          />
        ) : null}

        <SelectField
          value={dayOfWeek}
          placeholder="Todos os dias"
          testID="schedule-list-day"
          options={[
            { value: TODOS, label: 'Todos os dias' },
            ...Object.values(DayOfWeek).map((day) => ({
              value: day,
              label: DAY_OF_WEEK_LABELS[day],
            })),
          ]}
          onChange={setDayOfWeek}
        />

        {/* Agenda encerrada some por padrão. Sem este interruptor não haveria
            como achar a que acabou ontem — e é justamente a que se quer
            conferir quando algo some da grade. */}
        <ChoiceField
          label="Encerradas"
          required={false}
          testID="schedule-list-expired"
          options={[{ value: 'expired', label: 'Mostrar agendas expiradas' }]}
          selected={includeExpired ? ['expired'] : []}
          multiple
          onToggle={() => setIncludeExpired((current) => !current)}
        />

        {deleted ? <SuccessBanner message={deleted} testID="schedule-list-success" /> : null}
      </View>

      {isPending ? <LoadingState testID="schedule-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="schedule-list-error"
          message="Não foi possível carregar as agendas."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && schedules.length === 0 ? (
        <EmptyState
          testID="schedule-list-empty"
          message={
            hasFilter
              ? 'Nenhuma agenda para este filtro.'
              : 'Nenhuma agenda cadastrada.'
          }
        />
      ) : null}

      {!isPending && !isError && schedules.length > 0 ? (
        <FlatList
          data={schedules}
          keyExtractor={(schedule) => schedule.id}
          contentContainerStyle={styles.list}
          testID="schedule-list"
          renderItem={({ item }) => (
            <ScheduleCard
              schedule={item}
              onOpen={() => router.push(`/(app)/schedules/${item.id}`)}
              onEdit={() => router.push(`/(app)/schedules/${item.id}/edit`)}
              onDelete={() => setToDelete(item)}
            />
          )}
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="schedule-delete-dialog"
          title="Excluir agenda"
          message={`Tem certeza que deseja excluir a agenda de ${toDelete.professionalName}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          isOpen
          isPending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() => confirmDelete(toDelete)}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { padding: 16, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
})
