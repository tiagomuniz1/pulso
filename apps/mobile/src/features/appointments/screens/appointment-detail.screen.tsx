import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AppointmentStatus, PATIENT_GENDER_LABELS } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS } from '@app/core'
import { Button } from '../../../components/ui/button'
import { Card, CardTitle, Row } from '../../../components/ui/card'
import { TextField } from '../../../components/ui/fields'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useAppointment } from '../hooks/use-appointment.hook'
import { useCancelAppointment, useCompleteAppointment } from '../hooks/use-appointment-actions.hook'
import { formatShortDate, formatTime, todayIsoDate } from '../utils/agenda-date.util'

/** A idade é o que a profissional lê; a data de nascimento é o que o servidor manda. */
function ageFrom(birthDate: Date, todayIso: string): number {
  const [year, month, day] = todayIso.split('-').map(Number)
  let age = year - birthDate.getFullYear()
  const monthDiff = month - (birthDate.getMonth() + 1)
  if (monthDiff < 0 || (monthDiff === 0 && day < birthDate.getDate())) age -= 1
  return age
}

export function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: appointment, isLoading, isError, refetch } = useAppointment(id)
  const complete = useCompleteAppointment(id)
  const cancel = useCancelAppointment(id)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  if (isLoading) {
    return (
      <Screen testID="appointment-detail-screen">
        <LoadingState testID="appointment-loading" />
      </Screen>
    )
  }

  if (isError || !appointment) {
    return (
      <Screen testID="appointment-detail-screen">
        <ErrorState
          testID="appointment-error"
          message="Não foi possível carregar a consulta."
          onRetry={() => void refetch()}
        />
      </Screen>
    )
  }

  const isOpen =
    appointment.status === AppointmentStatus.SCHEDULED ||
    appointment.status === AppointmentStatus.CONFIRMED
  // Concluir consulta futura o backend recusa com 422. Esconder o botão evita
  // oferecer um caminho que só termina em erro.
  const isInThePast = appointment.date <= todayIsoDate()

  return (
    <Screen testID="appointment-detail-screen">
      <ScreenScroll>
        <Card testID="patient-card">
          <CardTitle>{appointment.patient.fullName}</CardTitle>
          {appointment.isFirstVisitWithProfessional ? (
            <Text style={styles.firstVisit} testID="first-visit-badge">
              Primeira vez com {appointment.professionalName}
            </Text>
          ) : null}
          <Row
            label="Idade"
            value={`${ageFrom(appointment.patient.birthDate, todayIsoDate())} anos`}
            testID="patient-age"
          />
          <Row
            label="Sexo"
            value={PATIENT_GENDER_LABELS[appointment.patient.gender]}
            testID="patient-gender"
          />
          <Row label="Telefone" value={appointment.patient.phoneNumber} testID="patient-phone" />
        </Card>

        <Card testID="appointment-card">
          <CardTitle>Consulta</CardTitle>
          <Row
            label="Quando"
            value={`${formatShortDate(appointment.date)} às ${formatTime(appointment.startTime)}`}
            testID="appointment-when"
          />
          <Row
            label="Profissional"
            value={appointment.professionalName}
            testID="appointment-professional"
          />
          {appointment.specialtyName ? (
            <Row
              label="Especialidade"
              value={appointment.specialtyName}
              testID="appointment-specialty"
            />
          ) : null}
          <Row
            label="Situação"
            value={APPOINTMENT_STATUS_LABELS[appointment.status]}
            testID="appointment-status"
          />
          {appointment.reason ? (
            <Row label="Motivo" value={appointment.reason} testID="appointment-reason" />
          ) : null}
          {appointment.cancellationReason ? (
            <Row
              label="Motivo do cancelamento"
              value={appointment.cancellationReason}
              testID="appointment-cancellation-reason"
            />
          ) : null}
        </Card>

        <Button
          label="Prontuário"
          onPress={() => router.push(`/(app)/appointments/${id}/medical-record`)}
          testID="open-medical-record"
        />

        {isOpen && isInThePast ? (
          <Button
            label="Concluir consulta"
            variant="outline"
            loading={complete.isPending}
            onPress={() => complete.mutate()}
            testID="complete-appointment"
          />
        ) : null}

        {isOpen && !cancelling ? (
          <Button
            label="Cancelar consulta"
            variant="danger"
            onPress={() => setCancelling(true)}
            testID="start-cancel"
          />
        ) : null}

        {isOpen && cancelling ? (
          <Card testID="cancel-card">
            <CardTitle>Cancelar consulta</CardTitle>
            <TextField
              label="Motivo"
              value={reason}
              onChange={setReason}
              multiline
              placeholder="Por que esta consulta não vai acontecer"
              testID="cancel-reason"
            />
            <Button
              label="Confirmar cancelamento"
              variant="danger"
              loading={cancel.isPending}
              onPress={() => cancel.mutate(reason)}
              testID="confirm-cancel"
            />
            <Button
              label="Voltar"
              variant="outline"
              onPress={() => setCancelling(false)}
              testID="abort-cancel"
            />
          </Card>
        ) : null}

        {complete.isError || cancel.isError ? (
          <Text style={styles.actionError} testID="action-error">
            Não foi possível concluir a ação. Tente de novo.
          </Text>
        ) : null}
      </ScreenScroll>
    </Screen>
  )
}

const styles = StyleSheet.create({
  firstVisit: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
  actionError: { fontSize: 14, color: '#b91c1c', textAlign: 'center' },
})
