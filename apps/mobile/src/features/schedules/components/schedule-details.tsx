import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DAY_OF_WEEK_LABELS, type IScheduleModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { formatTime, formatValidity } from './schedule-card'

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

/** Sem `canManage`, pelo mesmo motivo do cartão: quem abre uma agenda a gere. */
export function ScheduleDetails({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: IScheduleModel
  onEdit: () => void
  onDelete: () => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.wrapper} testID="schedule-details">
      <Text style={[styles.name, { color: theme.text }]} testID="schedule-details-professional">
        {schedule.professionalName}
      </Text>
      <Text style={[styles.day, { color: theme.textDim }]} testID="schedule-details-day">
        {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
      </Text>

      <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            hitSlop={12}
            testID="schedule-details-edit"
          >
            <Text style={[styles.action, { color: theme.accent }]}>Editar</Text>
          </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          hitSlop={12}
          testID="schedule-details-delete"
        >
          <Text style={[styles.action, { color: theme.danger }]}>Excluir</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.card,
          { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface },
        ]}
      >
        <DetailRow
          label="HORÁRIO"
          value={`${formatTime(schedule.startTime)} — ${formatTime(schedule.endTime)}`}
          testID="schedule-details-time"
        />
        <DetailRow
          label="DURAÇÃO DA CONSULTA"
          value={`${schedule.slotDurationInMinutes} minutos`}
          testID="schedule-details-duration"
        />
        <DetailRow
          label="VALIDADE"
          value={formatValidity(schedule.validFrom, schedule.validUntil)}
          testID="schedule-details-validity"
        />
        <DetailRow
          label="CADASTRADA EM"
          value={schedule.createdAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          testID="schedule-details-created-at"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  name: { fontSize: 22, fontWeight: '700' },
  day: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, padding: 16, gap: 14, marginTop: 8 },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  detailValue: { fontSize: 14 },
})
