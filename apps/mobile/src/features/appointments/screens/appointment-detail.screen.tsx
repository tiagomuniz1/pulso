import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AppointmentStatus } from '@app/shared'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { TextField } from '../../../components/ui/fields'
import { Button } from '../../../components/ui/button'
import { Card, CardTitle } from '../../../components/ui/card'
import { useTheme } from '../../../theme/theme-context'
import { MedicalRecordTab } from '../../medical-records/components/medical-record-tab'
import { AppointmentActionsBar } from '../components/appointment-actions-bar'
import { AppointmentHeaderCard } from '../components/appointment-header-card'
import { AppointmentTabs, type AppointmentTabId } from '../components/appointment-tabs'
import { HistoryTab } from '../components/history-tab'
import { ResumoTab } from '../components/resumo-tab'
import { useAppointment } from '../hooks/use-appointment.hook'
import { useCancelAppointment, useCompleteAppointment } from '../hooks/use-appointment-actions.hook'
import { todayIsoDate } from '../utils/agenda-date.util'

/**
 * A consulta, no desenho que a web usa em celular.
 *
 * Cartão-cabeçalho com a paciente em primeiro plano e os dados do atendimento
 * recolhidos, as oito abas, e a faixa de ações presa na base — fora da
 * rolagem, porque concluir não pode depender de rolar um prontuário inteiro.
 */
export function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const theme = useTheme()

  const [tab, setTab] = useState<AppointmentTabId>('resumo')
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [reassigning, setReassigning] = useState(false)

  const { data: appointment, isLoading, isError, refetch } = useAppointment(id)
  const complete = useCompleteAppointment(id)
  const cancel = useCancelAppointment(id)

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

  return (
    <Screen testID="appointment-detail-screen" edges={['top']}>
      <ScreenScroll>
        <AppointmentHeaderCard appointment={appointment} onBack={() => router.back()} />

        <AppointmentTabs activeId={tab} onChange={setTab} />

        {tab === 'resumo' ? <ResumoTab appointment={appointment} /> : null}

        {tab === 'prontuario' ? (
          <MedicalRecordTab appointmentId={id} specialtyId={appointment.specialtyId} />
        ) : null}

        {tab === 'historico' ? (
          <HistoryTab
            patientId={appointment.patientId}
            specialtyId={appointment.specialtyId}
            appointmentId={id}
          />
        ) : null}

        {cancelling ? (
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

        {reassigning ? (
          <Text style={[styles.notice, { color: theme.textDim }]} testID="reassign-unavailable">
            Trocar o profissional ainda não está disponível no app. Use o site.
          </Text>
        ) : null}

        {complete.isError || cancel.isError ? (
          <Text style={[styles.notice, { color: theme.danger }]} testID="action-error">
            Não foi possível concluir a ação. Tente de novo.
          </Text>
        ) : null}
      </ScreenScroll>

      {isOpen ? (
        <AppointmentActionsBar
          // Concluir consulta futura o backend recusa com 422.
          canComplete={appointment.date <= todayIsoDate()}
          isCompleting={complete.isPending}
          isCancelling={cancel.isPending}
          onReassign={() => setReassigning(true)}
          onCancel={() => setCancelling(true)}
          onComplete={() => complete.mutate()}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  notice: { fontSize: 13, textAlign: 'center' },
})
