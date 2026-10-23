import { StyleSheet, Text, View } from 'react-native'
import { COUNCIL_TYPE_OCCUPATION_LABELS, USER_ROLE_SHORT_LABELS, UserRole } from '@app/shared'
import type { IUserModel } from '@app/core'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'
import { Badge } from '../../../components/ui/list-screen'
import { useTheme } from '../../../theme/theme-context'
import { initialsOf } from '../../navigation/navigation-items'

/** O que a coluna "Tipo" mostra: a profissão de quem tem ficha. */
export function userTypeLabel(user: IUserModel): string {
  if (user.isProfessional) {
    return user.councilType ? COUNCIL_TYPE_OCCUPATION_LABELS[user.councilType] : 'Profissional'
  }
  return user.isPatient ? 'Paciente' : '—'
}

/** A bolinha com as iniciais, como na web. */
function Avatar({ fullName }: { fullName: string }) {
  const theme = useTheme()
  return (
    <View style={[styles.avatar, { backgroundColor: theme.warmSoft }]}>
      <Text style={[styles.avatarText, { color: theme.warm }]}>{initialsOf(fullName)}</Text>
    </View>
  )
}

export function UserCard({
  user,
  isCurrentUser,
  onOpen,
  onEdit,
  onDelete,
}: {
  user: IUserModel
  /**
   * Excluir a própria conta é perder o acesso na hora, sem volta — e numa
   * clínica com um administrador só, deixa a clínica sem ninguém capaz de
   * gerir usuários. O backend recusa; aqui o botão fica apagado.
   */
  isCurrentUser: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <ListCard
      testID={`user-card-${user.id}`}
      title={user.fullName}
      subtitle={user.email}
      leading={<Avatar fullName={user.fullName} />}
      rows={[
        {
          label: 'Status',
          value: (
            <Badge
              label={user.isActive ? 'Ativo' : 'Inativo'}
              tone={user.isActive ? 'good' : 'danger'}
              testID={`user-card-status-${user.id}`}
            />
          ),
        },
        {
          label: 'Perfil',
          value: (
            <Badge
              label={USER_ROLE_SHORT_LABELS[user.role]}
              tone={user.role === UserRole.ADMIN ? 'accent' : 'neutral'}
            />
          ),
        },
        { label: 'Tipo', value: userTypeLabel(user) },
        {
          label: 'Criado em',
          value: user.createdAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        },
      ]}
      actions={
        <>
          <ListCardAction
            label="Excluir"
            tone="danger"
            disabled={isCurrentUser}
            onPress={onDelete}
            testID={`user-card-delete-${user.id}`}
          />
          <ListCardAction label="Editar" onPress={onEdit} testID={`user-card-edit-${user.id}`} />
          <ListCardActionSpacer />
          <ListCardAction
            label="Ver detalhes ›"
            onPress={onOpen}
            testID={`user-card-open-${user.id}`}
          />
        </>
      }
    />
  )
}

const styles = StyleSheet.create({
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700' },
})
