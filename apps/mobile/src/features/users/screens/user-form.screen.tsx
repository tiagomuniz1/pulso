import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import type { ICreateUserInput, IUpdateUserInput } from '@app/core'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { UserForm } from '../components/user-form'
import { useCreateUser, useUpdateUser, useUser } from '../hooks/use-users.hook'

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

export function NewUserScreen() {
  const router = useRouter()
  const create = useCreateUser()

  return (
    <FormFrame title="Novo usuário" onBack={() => router.back()} testID="user-new-screen">
      <ScreenScroll testID="user-new-content">
        <UserForm
          user={null}
          canChangeRole
          isSubmitting={create.isPending}
          submitError={create.error ?? null}
          onSubmit={(input) =>
            create.mutate(input as ICreateUserInput, { onSuccess: () => router.back() })
          }
        />
      </ScreenScroll>
    </FormFrame>
  )
}

/**
 * A edição de usuário — e também o "Meu perfil".
 *
 * PROFESSIONAL e USER chegam aqui pelo próprio nome no menu, sem passar pela
 * listagem, que não lhes é oferecida. O que muda entre os dois caminhos é
 * uma regra só: perfil de acesso é do ADMIN, e nem ele troca o próprio.
 */
export function EditUserScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionStore((state) => state.user)

  const { data: user, isPending, isError, refetch } = useUser(id)
  const update = useUpdateUser(id)

  const canChangeRole = session?.role === UserRole.ADMIN && session?.id !== id

  return (
    <FormFrame title="Editar usuário" onBack={() => router.back()} testID="user-edit-screen">
      {isPending ? <LoadingState testID="user-edit-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="user-edit-error"
          message="Não foi possível carregar os dados do usuário."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && user ? (
        <ScreenScroll testID="user-edit-content">
          <UserForm
            user={user}
            canChangeRole={canChangeRole}
            isSubmitting={update.isPending}
            submitError={update.error ?? null}
            onSubmit={(input) =>
              update.mutate(input as IUpdateUserInput, { onSuccess: () => router.back() })
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
