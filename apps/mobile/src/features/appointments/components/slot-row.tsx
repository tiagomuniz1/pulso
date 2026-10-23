import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AppointmentStatus, APPOINTMENT_LABEL_COLOR_HEX } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS, type IAgendaSlot } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import type { ThemeTokens } from '../../../theme/theme'
import { withAlpha } from '../utils/color.util'

/**
 * Uma linha da grade do dia — a mesma célula da web, em React Native.
 *
 * A cor da borda **é** a situação da consulta, e é a única pista dela quando o
 * espaço aperta. Os percentuais de preenchimento são os mesmos que a web
 * escreve como `bg-accent/10` e `/20`.
 */
function statusStyle(status: AppointmentStatus, theme: ThemeTokens) {
  const map: Record<AppointmentStatus, { fill: string; border: string; text: string }> = {
    [AppointmentStatus.SCHEDULED]: {
      fill: withAlpha(theme.accent, 10),
      border: theme.accent,
      text: theme.accent,
    },
    [AppointmentStatus.CONFIRMED]: {
      fill: withAlpha(theme.accent, 20),
      border: theme.accent,
      text: theme.accent,
    },
    [AppointmentStatus.CANCELLED]: {
      fill: withAlpha(theme.danger, 10),
      border: theme.danger,
      text: theme.danger,
    },
    [AppointmentStatus.COMPLETED]: {
      fill: withAlpha(theme.good, 10),
      border: theme.good,
      text: theme.good,
    },
    [AppointmentStatus.NO_SHOW]: {
      fill: withAlpha(theme.warn, 10),
      border: theme.warn,
      text: theme.warn,
    },
  }
  return map[status]
}

export function SlotRow({
  slot,
  canManage,
  isPast,
  onPress,
  onBook,
}: {
  slot: IAgendaSlot
  canManage: boolean
  isPast: boolean
  /**
   * Recebe o id porque só a linha com consulta chama: devolver o slot faria a
   * tela testar de novo se há consulta, num ramo que nunca é falso.
   */
  onPress: (appointmentId: string) => void
  onBook: () => void
}) {
  const theme = useTheme()
  const appointment = slot.appointment

  if (!appointment) {
    const bookable = canManage && !isPast
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          bookable ? `Agendar ${slot.startTime}` : `Horário livre ${slot.startTime}`
        }
        disabled={!bookable}
        onPress={onBook}
        style={[
          styles.row,
          styles.free,
          { borderRadius: theme.radius.md, borderColor: theme.line, opacity: bookable ? 1 : 0.4 },
        ]}
        testID={`agenda-slot-free-${slot.startTime}`}
      >
        <Text style={[styles.time, { color: theme.textDim }]}>{slot.startTime}</Text>
        <Text style={[styles.freeLabel, { color: theme.textMute }]}>
          {isPast ? 'Passado' : canManage ? 'Livre — clique para agendar' : 'Livre'}
        </Text>
      </Pressable>
    )
  }

  const tone = statusStyle(appointment.status, theme)
  const stripe = appointment.label
    ? APPOINTMENT_LABEL_COLOR_HEX[appointment.label.color][theme.isDark ? 'dark' : 'light'].base
    : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        appointment.label
          ? `Consulta ${appointment.patientName} às ${slot.startTime}, rótulo ${appointment.label.name}`
          : `Consulta ${appointment.patientName} às ${slot.startTime}`
      }
      onPress={() => onPress(appointment.id)}
      testID={`agenda-slot-booked-${appointment.id}`}
      style={[
        styles.row,
        {
          borderRadius: theme.radius.md,
          backgroundColor: tone.fill,
          borderColor: tone.border,
          // Respiro entre a faixa e o horário, só quando há faixa.
          paddingLeft: stripe ? 16 : 12,
        },
      ]}
    >
      {stripe ? (
        // Absoluta e por dentro do arredondamento, como na web: uma borda
        // esquerda mais grossa sobrescreveria a borda de situação, que é a
        // única pista dela quando o espaço aperta.
        <View
          style={[styles.stripe, { backgroundColor: stripe }]}
          testID={`agenda-slot-label-${appointment.id}`}
        />
      ) : null}
      <Text style={[styles.time, { color: tone.text }]}>{slot.startTime}</Text>
      {appointment.seriesId &&
      appointment.seriesSequence !== null &&
      appointment.seriesTotalOccurrences !== null ? (
        <Text
          style={[styles.recurrence, { color: tone.text, borderColor: tone.border }]}
          testID={`agenda-slot-recurring-${appointment.id}`}
        >
          {appointment.seriesSequence}/{appointment.seriesTotalOccurrences}
        </Text>
      ) : null}
      <Text style={[styles.patient, { color: tone.text }]} numberOfLines={1}>
        {appointment.patientName}
      </Text>
      <Text style={[styles.status, { color: tone.text }]}>
        {APPOINTMENT_STATUS_LABELS[appointment.status]}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
  },
  free: { borderStyle: 'dashed' },
  stripe: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 },
  time: { fontFamily: 'Courier', fontSize: 12, width: 44 },
  freeLabel: { fontSize: 12 },
  patient: { flex: 1, fontSize: 14, fontWeight: '500' },
  status: { fontSize: 11 },
  recurrence: { fontSize: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1 },
})
