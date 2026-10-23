import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { UserDetails } from '../components/user-details'
import { useDeleteUser, useSendSetPasswordEmail, useUser } from '../hooks/use-users.hook'

/**
 * O backend responde `503` quando o e-mail não sai — de propósito, para a
 * tela não confirmar uma entrega que não aconteceu. Nunca mostramos o
 * `detail` técnico: a mensagem é traduzida por status.
 */
function sendEmailMessageFor(status: number | undefined): string | null {
  if (status === undefined) return null
  if (status === 503) {
    return 'Não foi possível enviar o e-mail. O envio pode não estar configurado — fale com o suporte.'
  }
  if (status === 422) return 'Ative o usuário antes de enviar o link.'
  return 'Ocorreu um erro ao enviar o e-mail. Tente novamente.'
}

export function UserDetailScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useSessionStore((state) => state.user)

  const canManage = session?.role === UserRole.ADMIN
  const isCurrentUser = session?.id === id

  const [isDeleting, setDeleting] = useState(false)
  const { data: user, isPending, isError, refetch } = useUser(id)
  const remove = useDeleteUser()
  const sendEmail = useSendSetPasswordEmail()

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
    <Screen testID="user-detail-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="user-detail-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      </View>

      {isPending ? <LoadingState testID="user-detail-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="user-detail-error"
          message="Não foi possível carregar os dados do usuário."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && user ? (
        <>
        <ScreenScroll testID="user-detail-content">
          <UserDetails
            user={user}
            canManage={canManage}
            isCurrentUser={isCurrentUser}
            onEdit={() => router.push(`/(app)/users/${user.id}/edit`)}
            onDelete={() => setDeleting(true)}
            onSendSetPasswordEmail={() => {
              sendEmail.reset()
              sendEmail.mutate(user.id)
            }}
            isSendingEmail={sendEmail.isPending}
            sendEmailMessage={sendEmailMessageFor(sendEmail.error?.status)}
            emailSentTo={sendEmail.isSuccess ? user.email : null}
          />
        </ScreenScroll>

        {/* Dentro do ramo que já tem o usuário: fora dele a mensagem
            precisaria de um `?? ''` para um caso que não acontece — a folha
            só abre a partir de um botão que não existe sem usuário. */}
        {isDeleting ? (
          <ConfirmSheet
            testID="user-detail-delete-dialog"
            title="Excluir usuário"
            message={`Tem certeza que deseja excluir o usuário ${user.fullName}? Esta ação não pode ser desfeita.`}
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
