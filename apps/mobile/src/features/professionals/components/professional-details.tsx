import { Pressable, StyleSheet, Text, View } from 'react-native'
import { COUNCIL_TYPE_LABELS } from '@app/shared'
import type { IProfessionalModel } from '@app/core'
import { Badge } from '../../../components/ui/list-screen'
import { useTheme } from '../../../theme/theme-context'

function DetailRow({ label, value, testID }: { label: string; value: string; testID: string }) {
  const theme = useTheme()
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} testID={testID}>
        {value}
      </Text>
    </View>
  )
}

/**
 * A ficha do profissional.
 *
 * Registros e especialidades são listas, e aparecem como pastilhas — um
 * profissional pode ter mais de um conselho (o fisioterapeuta que também é
 * educador físico) e mais de uma especialidade.
 */
export function ProfessionalDetails({
  professional,
  canManage,
  onEdit,
  onDelete,
}: {
  professional: IProfessionalModel
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.wrapper} testID="professional-details">
      <Text style={[styles.name, { color: theme.text }]} testID="professional-details-name">
        {professional.user.fullName}
      </Text>
      <Text style={[styles.email, { color: theme.textDim }]} testID="professional-details-email">
        {professional.user.email}
      </Text>

      {canManage ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            hitSlop={12}
            testID="professional-details-edit"
          >
            <Text style={[styles.action, { color: theme.accent }]}>Editar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            hitSlop={12}
            testID="professional-details-delete"
          >
            <Text style={[styles.action, { color: theme.danger }]}>Excluir</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface },
        ]}
      >
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textMute }]}>REGISTRO</Text>
          <View style={styles.pills} testID="professional-details-registrations">
            {professional.registrations.map((registration) => (
              <Badge
                key={registration.id}
                testID={`professional-details-registration-${registration.id}`}
                tone={registration.isPrimary ? 'accent' : 'neutral'}
                label={`${COUNCIL_TYPE_LABELS[registration.councilType]} ${registration.number}/${registration.state}${
                  registration.isPrimary ? ' · principal' : ''
                }`}
              />
            ))}
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textMute }]}>ESPECIALIDADES</Text>
          {professional.specialties.length === 0 ? (
            <Text
              style={[styles.detailValue, { color: theme.textMute }]}
              testID="professional-details-no-specialties"
            >
              Nenhuma especialidade cadastrada.
            </Text>
          ) : (
            <View style={styles.pills} testID="professional-details-specialties">
              {professional.specialties.map((specialty) => (
                <Badge
                  key={specialty.id}
                  testID={`professional-details-specialty-${specialty.id}`}
                  label={
                    specialty.registryNumber
                      ? `${specialty.name} — RQE ${specialty.registryNumber}`
                      : specialty.name
                  }
                />
              ))}
            </View>
          )}
        </View>

        <DetailRow
          label="CADASTRADO EM"
          value={professional.createdAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          testID="professional-details-created-at"
        />

        {professional.bio ? (
          <DetailRow label="BIO" value={professional.bio} testID="professional-details-bio" />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, padding: 16, gap: 14, marginTop: 8 },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  detailValue: { fontSize: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})
