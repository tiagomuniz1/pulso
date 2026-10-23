import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { ScheduleDetails } from '../components/schedule-details'
import { useDeleteSchedule, useSchedule } from '../hooks/use-schedules.hook'

/**
 * O detalhe da agenda.
 *
 * Não há recorte de papel aqui: a listagem já devolve ao PROFESSIONAL só as
 * próprias agendas, e quem abre uma pode geri-la.
 */
export function ScheduleDetailScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [isDeleting, setDeleting] = useState(false)
  const { data: schedule, isPending, isError, refetch } = useSchedule(id)
  const remove = useDeleteSchedule()

  function confirmDelete() {
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(false)
        router.back()
      },
      onError: () => setDeleting(false),
    })
  }

  return (
    <Screen testID="schedule-detail-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="schedule-detail-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      </View>

      {isPending ? <LoadingState testID="schedule-detail-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="schedule-detail-error"
          message="Não foi possível carregar a agenda."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && schedule ? (
        <>
          <ScreenScroll testID="schedule-detail-content">
            <ScheduleDetails
              schedule={schedule}
              onEdit={() => router.push(`/(app)/schedules/${schedule.id}/edit`)}
              onDelete={() => setDeleting(true)}
            />
          </ScreenScroll>

          {isDeleting ? (
            <ConfirmSheet
              testID="schedule-detail-delete-dialog"
              title="Excluir agenda"
              message={`Tem certeza que deseja excluir a agenda de ${schedule.professionalName}? Esta ação não pode ser desfeita.`}
              confirmLabel="Excluir"
              isOpen
              isPending={remove.isPending}
              onClose={() => setDeleting(false)}
              onConfirm={confirmDelete}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
