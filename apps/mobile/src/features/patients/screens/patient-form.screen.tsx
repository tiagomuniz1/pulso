import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import type { ICreatePatientInput, IUpdatePatientInput } from '@app/core'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { PatientForm } from '../components/patient-form'
import { useCreatePatient, usePatient, useUpdatePatient } from '../hooks/use-patients.hook'

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

/** Cadastro de paciente novo. */
export function NewPatientScreen() {
  const router = useRouter()
  const create = useCreatePatient()

  return (
    <FormFrame title="Novo paciente" onBack={() => router.back()} testID="patient-new-screen">
      <ScreenScroll testID="patient-new-content">
        <PatientForm
          patient={null}
          isSubmitting={create.isPending}
          submitError={create.error ?? null}
          onSubmit={(input) =>
            create.mutate(input as ICreatePatientInput, {
              // `back()` e não `push` para a lista: a pessoa veio de lá, e
              // empilhar outra cópia deixaria dois "Pacientes" na pilha.
              onSuccess: () => router.back(),
            })
          }
        />
      </ScreenScroll>
    </FormFrame>
  )
}

/** Edição de paciente existente. */
export function EditPatientScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: patient, isPending, isError, refetch } = usePatient(id)
  const update = useUpdatePatient(id)

  return (
    <FormFrame title="Editar paciente" onBack={() => router.back()} testID="patient-edit-screen">
      {isPending ? <LoadingState testID="patient-edit-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="patient-edit-error"
          message="Não foi possível carregar os dados do paciente."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && patient ? (
        <ScreenScroll testID="patient-edit-content">
          <PatientForm
            patient={patient}
            isSubmitting={update.isPending}
            submitError={update.error ?? null}
            onSubmit={(input) =>
              update.mutate(input as IUpdatePatientInput, { onSuccess: () => router.back() })
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
