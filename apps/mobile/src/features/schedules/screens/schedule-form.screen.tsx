import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import type { ICreateScheduleInput, IUpdateScheduleInput } from '@app/core'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { ScheduleForm } from '../components/schedule-form'
import { useCreateSchedule, useSchedule, useUpdateSchedule } from '../hooks/use-schedules.hook'

function FormFrame({
  title,
  children,
  onBack,
  testID,
}: {
  title: string
  children: React.ReactNode
  onBack: () => void
  testID: string
}) {
  const theme = useTheme()
  return (
    <Screen testID={testID}>
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          hitSlop={12}
          testID={`${testID}-back`}
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </Screen>
  )
}

export function NewScheduleScreen() {
  const router = useRouter()
  const create = useCreateSchedule()

  return (
    <FormFrame title="Nova agenda" onBack={() => router.back()} testID="schedule-new-screen">
      <ScreenScroll testID="schedule-new-content">
        <ScheduleForm
          schedule={null}
          isSubmitting={create.isPending}
          submitError={create.error ?? null}
          onSubmit={(input) =>
            create.mutate(input as ICreateScheduleInput, { onSuccess: () => router.back() })
          }
        />
      </ScreenScroll>
    </FormFrame>
  )
}

export function EditScheduleScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: schedule, isPending, isError, refetch } = useSchedule(id)
  const update = useUpdateSchedule(id)

  return (
    <FormFrame title="Editar agenda" onBack={() => router.back()} testID="schedule-edit-screen">
      {isPending ? <LoadingState testID="schedule-edit-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="schedule-edit-error"
          message="Não foi possível carregar a agenda."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && schedule ? (
        <ScreenScroll testID="schedule-edit-content">
          <ScheduleForm
            schedule={schedule}
            isSubmitting={update.isPending}
            submitError={update.error ?? null}
            onSubmit={(input) =>
              update.mutate(input as IUpdateScheduleInput, { onSuccess: () => router.back() })
            }
          />
        </ScreenScroll>
      ) : null}
    </FormFrame>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '700' },
})
