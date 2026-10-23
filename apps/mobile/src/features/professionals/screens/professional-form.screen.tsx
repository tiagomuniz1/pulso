import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import type { ICreateProfessionalInput, IUpdateProfessionalInput } from '@app/core'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { ProfessionalForm } from '../components/professional-form'
import {
  useCreateProfessional,
  useProfessional,
  useUpdateProfessional,
} from '../hooks/use-professionals.hook'

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

export function NewProfessionalScreen() {
  const router = useRouter()
  const create = useCreateProfessional()

  return (
    <FormFrame
      title="Novo profissional"
      onBack={() => router.back()}
      testID="professional-new-screen"
    >
      <ScreenScroll testID="professional-new-content">
        <ProfessionalForm
          professional={null}
          isSubmitting={create.isPending}
          submitError={create.error ?? null}
          onSubmit={(input) =>
            create.mutate(input as ICreateProfessionalInput, { onSuccess: () => router.back() })
          }
        />
      </ScreenScroll>
    </FormFrame>
  )
}

export function EditProfessionalScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: professional, isPending, isError, refetch } = useProfessional(id)
  const update = useUpdateProfessional(id)

  return (
    <FormFrame
      title="Editar profissional"
      onBack={() => router.back()}
      testID="professional-edit-screen"
    >
      {isPending ? <LoadingState testID="professional-edit-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="professional-edit-error"
          message="Não foi possível carregar os dados do profissional."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && professional ? (
        <ScreenScroll testID="professional-edit-content">
          <ProfessionalForm
            professional={professional}
            isSubmitting={update.isPending}
            submitError={update.error ?? null}
            onSubmit={(input) =>
              update.mutate(input as IUpdateProfessionalInput, { onSuccess: () => router.back() })
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
