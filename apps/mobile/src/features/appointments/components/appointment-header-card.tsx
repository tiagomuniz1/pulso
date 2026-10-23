import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { AppointmentStatus, APPOINTMENT_LABEL_COLOR_HEX, PATIENT_GENDER_LABELS } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS, type IAppointmentDetailModel } from '@app/core'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'
import { initialsOf } from '../../navigation/navigation-items'
import { useActiveAppointmentLabels } from '../hooks/use-agenda-filters.hook'
import { useSetAppointmentLabel } from '../hooks/use-set-appointment-label.hook'
import { formatShortDate, formatTime } from '../utils/agenda-date.util'
import { ageFrom } from '../utils/age.util'

/** Ponto colorido antes da situação, como na web. */
function statusColor(status: AppointmentStatus, theme: ReturnType<typeof useTheme>): string {
  const map: Record<AppointmentStatus, string> = {
    [AppointmentStatus.SCHEDULED]: theme.accent,
    [AppointmentStatus.CONFIRMED]: theme.accent,
    [AppointmentStatus.CANCELLED]: theme.danger,
    [AppointmentStatus.COMPLETED]: theme.good,
    [AppointmentStatus.NO_SHOW]: theme.warn,
  }
  return map[status]
}

/**
 * O cartão do topo da consulta, como a web o desenha em celular.
 *
 * Os dados do atendimento — profissional, especialidade, data e horário —
 * vêm **recolhidos** atrás de "Ver detalhes da consulta". Quem abre esta tela
 * já sabe que consulta é; o que ele quer ver primeiro é quem está na frente
 * dele. No desktop os quatro cabem na mesma faixa e ficam sempre visíveis.
 */
export function AppointmentHeaderCard({
  appointment,
  canSetLabel,
  onBack,
  onViewSeries,
}: {
  appointment: IAppointmentDetailModel
  /** Marcar é de quem atende: o ADMIN em qualquer consulta, o profissional na dele. */
  canSetLabel: boolean
  onBack: () => void
  onViewSeries: () => void
}) {
  const theme = useTheme()
  const [isExpanded, setExpanded] = useState(false)

  const labels = useActiveAppointmentLabels()
  const setLabel = useSetAppointmentLabel(appointment.id)
  const labelSwatch = appointment.label
    ? APPOINTMENT_LABEL_COLOR_HEX[appointment.label.color][theme.isDark ? 'dark' : 'light'].base
    : null

  const summary = [
    PATIENT_GENDER_LABELS[appointment.patient.gender],
    `${ageFrom(appointment.patient.birthDate)} anos`,
    appointment.specialtyName,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <View
      style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
      testID="appointment-header-card"
    >
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          testID="appointment-back"
          style={[styles.backButton, { borderColor: theme.line, backgroundColor: theme.surface2 }]}
        >
          <Feather name="arrow-left" size={16} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Consulta</Text>
        <View style={styles.status}>
          <View
            style={[styles.statusDot, { backgroundColor: statusColor(appointment.status, theme) }]}
          />
          <Text style={[styles.statusText, { color: theme.textDim }]} testID="appointment-status">
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Text>
        </View>
      </View>

      <View style={styles.patientRow}>
        <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
          <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 15 }}>
            {initialsOf(appointment.patient.fullName)}
          </Text>
        </View>
        <View style={styles.patientText}>
          <Text
            style={[styles.patientName, { color: theme.text }]}
            numberOfLines={1}
            testID="header-patient-name"
          >
            {appointment.patient.fullName}
          </Text>
          {appointment.isFirstVisitWithProfessional ? (
            <View
              style={[styles.pill, { backgroundColor: theme.accentSoft, borderRadius: theme.radius.xl }]}
              testID="first-visit-badge"
            >
              <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '600' }}>
                Primeira vez
              </Text>
            </View>
          ) : null}
          <Text
            style={[styles.summary, { color: theme.textMute }]}
            numberOfLines={1}
            testID="header-patient-summary"
          >
            {summary}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setExpanded(!isExpanded)}
        testID="appointment-details-toggle"
        style={[styles.toggle, { borderColor: theme.line }]}
      >
        <Text style={{ color: theme.text, fontSize: 14 }}>Ver detalhes da consulta</Text>
        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.details} testID="appointment-details">
          <Detail label="Profissional" value={appointment.professionalName} testID="detail-professional" />
          <Detail
            label="Especialidade"
            value={appointment.specialtyName ?? '—'}
            testID="detail-specialty"
          />
          <Detail label="Data" value={formatShortDate(appointment.date)} testID="detail-date" />
          <Detail
            label="Horário"
            value={`${formatTime(appointment.startTime)} — ${formatTime(appointment.endTime)}`}
            testID="detail-time"
          />

          {appointment.seriesId &&
          appointment.seriesSequence !== null &&
          appointment.seriesTotalOccurrences !== null ? (
            <View style={styles.wide}>
              <Text style={[styles.detailLabel, { color: theme.textMute }]}>RECORRÊNCIA</Text>
              <View style={styles.recurrenceRow}>
                <Text
                  style={[styles.recurrenceBadge, { color: theme.accent, borderColor: theme.accent }]}
                  testID="detail-series"
                >
                  {appointment.seriesSequence}/{appointment.seriesTotalOccurrences}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onViewSeries}
                  testID="detail-view-series"
                  hitSlop={8}
                >
                  <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                    Ver série
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Marcar o rótulo vive aqui, e não no bloco da agenda: na web é o
              diálogo de detalhes que o oferece, e é a única porta para ele. */}
          <View style={styles.wide}>
            <Text style={[styles.detailLabel, { color: theme.textMute }]}>RÓTULO</Text>
            {canSetLabel ? (
              <View style={styles.labelRow}>
                <View style={styles.labelSelect}>
                  <SelectField
                    value={appointment.label?.id ?? ''}
                    options={[
                      { value: '', label: 'Sem rótulo' },
                      ...(labels.data?.data ?? []).map((label) => ({
                        value: label.id,
                        label: label.name,
                      })),
                    ]}
                    onChange={(value) => setLabel.mutate(value === '' ? null : value)}
                    placeholder="Sem rótulo"
                    testID="detail-label-select"
                  />
                </View>
                {/* Amostra, e não pastilha: o seletor já escreve o nome, e
                    repeti-lo ao lado não cabe em 375px. Falta só a cor. */}
                {labelSwatch ? (
                  <View
                    style={[styles.swatch, { backgroundColor: labelSwatch, borderRadius: theme.radius.md }]}
                    testID="detail-label-swatch"
                  />
                ) : null}
              </View>
            ) : (
              <Text style={[styles.detailValue, { color: theme.text }]} testID="detail-label">
                {appointment.label?.name ?? '—'}
              </Text>
            )}
            {setLabel.isError ? (
              <Text style={{ color: theme.danger, fontSize: 12 }} testID="detail-label-error">
                Não foi possível salvar o rótulo.
              </Text>
            ) : null}
          </View>

          {appointment.reason ? (
            <View style={styles.wide}>
              <Text style={[styles.detailLabel, { color: theme.textMute }]}>MOTIVO</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} testID="detail-reason">
                {appointment.reason}
              </Text>
            </View>
          ) : null}

          {appointment.cancellationReason ? (
            <View style={styles.wide}>
              <Text style={[styles.detailLabel, { color: theme.textMute }]}>
                MOTIVO DO CANCELAMENTO
              </Text>
              <Text
                style={[styles.detailValue, { color: theme.text }]}
                testID="detail-cancellation-reason"
              >
                {appointment.cancellationReason}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

/** Duas colunas, como na web: rótulo em maiúsculas pequenas e valor abaixo. */
function Detail({ label, value, testID }: { label: string; value: string; testID: string }) {
  const theme = useTheme()
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} testID={testID}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, paddingTop: 16, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  patientRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  patientText: { flex: 1, gap: 4 },
  patientName: { fontSize: 15, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 },
  summary: { fontSize: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    borderTopWidth: 1,
  },
  details: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16 },
  detail: { width: '50%', paddingBottom: 14, paddingRight: 8 },
  wide: { width: '100%', paddingBottom: 14, gap: 4 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurrenceBadge: {
    fontSize: 11,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelSelect: { flex: 1 },
  swatch: { width: 24, height: 24 },
  detailLabel: { fontSize: 10, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, marginTop: 2 },
})
