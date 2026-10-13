import { Pressable, StyleSheet, Text, View } from 'react-native'
import { APPOINTMENT_LABEL_COLOR_HEX, AppointmentStatus } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS, type IAppointmentModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { formatTime } from '../utils/agenda-date.util'

/**
 * Uma consulta na fila do dia.
 *
 * A faixa colorida à esquerda é o rótulo, e é o motivo de o rótulo existir:
 * reconhecer de relance o que se está olhando. A cor sai da mesma paleta da
 * web, pelo `@app/shared` — "Mostarda" tem de ser o mesmo mostarda dos dois
 * lados, senão o reconhecimento não acontece.
 *
 * Consulta cancelada fica, esmaecida e riscada, em vez de sumir: desaparecer
 * sem rastro faz a profissional procurar o horário que ela lembra de ter visto.
 */
export function AppointmentRow({
  appointment,
  onPress,
}: {
  appointment: IAppointmentModel
  onPress: () => void
}) {
  const theme = useTheme()
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED
  // Nome e cores num objeto só, derivados de uma condição só: separá-los em
  // duas variáveis criava um `label && cores` cujo lado "tem rótulo mas não
  // tem cor" não existe.
  const chip = appointment.label
    ? {
        name: appointment.label.name,
        ...APPOINTMENT_LABEL_COLOR_HEX[appointment.label.color][
          theme.isDark ? 'dark' : 'light'
        ],
      }
    : null

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`appointment-row-${appointment.id}`}
      style={[
        styles.row,
        { borderRadius: theme.radius.md, opacity: isCancelled ? 0.55 : 1 },
      ]}
    >
      <View
        style={[styles.stripe, { backgroundColor: chip?.base ?? 'transparent' }]}
        testID={`appointment-stripe-${appointment.id}`}
      />
      <View style={styles.time}>
        <Text style={[styles.timeText, { color: theme.accent }]}>
          {formatTime(appointment.startTime)}
        </Text>
        <Text style={styles.endTime}>{formatTime(appointment.endTime)}</Text>
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.patient, isCancelled && styles.struck]}
          numberOfLines={1}
          testID={`appointment-patient-${appointment.id}`}
        >
          {appointment.patientName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {appointment.specialtyName ?? appointment.professionalName}
        </Text>
        <View style={styles.badges}>
          <Text style={styles.status} testID={`appointment-status-${appointment.id}`}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Text>
          {chip ? (
            <Text
              style={[styles.label, { backgroundColor: chip.soft, color: chip.base }]}
              testID={`appointment-label-${appointment.id}`}
            >
              {chip.name}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    padding: 12,
    minHeight: 72,
    backgroundColor: 'rgba(127,127,127,0.06)',
    overflow: 'hidden',
  },
  stripe: { width: 4, borderRadius: 2 },
  time: { width: 52 },
  timeText: { fontSize: 16, fontWeight: '700' },
  endTime: { fontSize: 12, color: '#6b7280' },
  body: { flex: 1, gap: 2 },
  patient: { fontSize: 15, fontWeight: '600', color: '#111827' },
  struck: { textDecorationLine: 'line-through' },
  meta: { fontSize: 13, color: '#6b7280' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  status: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  label: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
})
