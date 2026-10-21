import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  UserRole,
} from '@app/shared'
import {
  primaryProfessionLabel,
  primaryRegistrationLabel,
  type IUserModel,
} from '@app/core'
import { Badge } from '../../../components/ui/list-screen'
import { useTheme } from '../../../theme/theme-context'
import { useProfessionalByUserId } from '../hooks/use-professional-by-user-id.hook'

function DetailRow({
  label,
  value,
  description,
  testID,
}: {
  label: string
  value: string
  description?: string
  testID: string
}) {
  const theme = useTheme()
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} testID={testID}>
        {value}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textMute }]}>{description}</Text>
      ) : null}
    </View>
  )
}

/**
 * Os dados do usuário.
 *
 * **Perfil de acesso vem com a descrição do que ele faz**, como na web: o
 * nome sozinho não diz a diferença entre "Recepcionista" e "Profissional"
 * para quem está cadastrando a equipe pela primeira vez.
 */
export function UserDetails({
  user,
  canManage,
  isCurrentUser,
  onEdit,
  onDelete,
  onSendSetPasswordEmail,
  isSendingEmail,
  sendEmailMessage,
  emailSentTo,
}: {
  user: IUserModel
  canManage: boolean
  isCurrentUser: boolean
  onEdit: () => void
  onDelete: () => void
  onSendSetPasswordEmail: () => void
  isSendingEmail: boolean
  sendEmailMessage: string | null
  emailSentTo: string | null
}) {
  const theme = useTheme()
  const hasProfessionalProfile = user.isProfessional

  const { professional, isPending: isProfessionalPending } = useProfessionalByUserId(user.id, {
    enabled: hasProfessionalProfile,
  })

  // PATIENT não faz login, então o link não tem para onde levar — o botão
  // some em vez de aparecer e falhar com `422`.
  const showSetPassword = canManage && user.role !== UserRole.PATIENT

  return (
    <View style={styles.wrapper} testID="user-details">
      <Text style={[styles.name, { color: theme.text }]} testID="user-details-name">
        {user.fullName}
      </Text>
      <Text style={[styles.email, { color: theme.textDim }]} testID="user-details-email">
        {user.email}
      </Text>

      {canManage ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            hitSlop={12}
            testID="user-details-edit"
          >
            <Text style={[styles.action, { color: theme.accent }]}>Editar</Text>
          </Pressable>
          {showSetPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSendingEmail || !user.isActive, busy: isSendingEmail }}
              disabled={isSendingEmail || !user.isActive}
              onPress={onSendSetPasswordEmail}
              hitSlop={12}
              testID="user-details-send-set-password"
              style={{ opacity: isSendingEmail || !user.isActive ? 0.5 : 1 }}
            >
              <Text style={[styles.action, { color: theme.accent }]}>Enviar link de senha</Text>
            </Pressable>
          ) : null}
          {/* Excluir a si mesmo é perder o acesso na hora, sem volta. */}
          {!isCurrentUser ? (
            <Pressable
              accessibilityRole="button"
              onPress={onDelete}
              hitSlop={12}
              testID="user-details-delete"
            >
              <Text style={[styles.action, { color: theme.danger }]}>Excluir</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {emailSentTo ? (
        <Text
          style={[styles.notice, { color: theme.good }]}
          testID="user-details-send-set-password-success"
        >
          {`Link de definição de senha enviado para ${emailSentTo}.`}
        </Text>
      ) : null}

      {sendEmailMessage ? (
        <Text
          style={[styles.notice, { color: theme.danger }]}
          testID="user-details-send-set-password-error"
        >
          {sendEmailMessage}
        </Text>
      ) : null}

      <View
        style={[
          styles.card,
          { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface },
        ]}
      >
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textMute }]}>STATUS</Text>
          <View style={styles.badgeWrapper}>
            <Badge
              label={user.isActive ? 'Ativo' : 'Inativo'}
              tone={user.isActive ? 'good' : 'danger'}
              testID="user-details-status"
            />
          </View>
        </View>

        <DetailRow
          label="PERFIL DE ACESSO"
          value={USER_ROLE_LABELS[user.role]}
          description={USER_ROLE_DESCRIPTIONS[user.role]}
          testID="user-details-role"
        />

        <DetailRow
          label="CADASTRADO EM"
          value={user.createdAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          testID="user-details-created-at"
        />

        {hasProfessionalProfile && professional ? (
          <DetailRow
            label="PROFISSÃO"
            value={`${primaryProfessionLabel(professional.registrations)} (${primaryRegistrationLabel(professional.registrations)})`}
            testID="user-details-profession"
          />
        ) : null}

        {hasProfessionalProfile && isProfessionalPending ? (
          <Text
            style={[styles.description, { color: theme.textMute }]}
            testID="user-details-profession-loading"
          >
            Carregando profissão...
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 4 },
  action: { fontSize: 14, fontWeight: '600' },
  notice: { fontSize: 13 },
  card: { borderWidth: 1, padding: 16, gap: 14, marginTop: 8 },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  detailValue: { fontSize: 14 },
  description: { fontSize: 12, lineHeight: 17 },
  badgeWrapper: { flexDirection: 'row' },
})
