import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AppointmentStatus, UserRole } from '@app/shared'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { TextField } from '../../../components/ui/fields'
import { Button } from '../../../components/ui/button'
import { Card, CardTitle } from '../../../components/ui/card'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { MedicalRecordTab } from '../../medical-records/components/medical-record-tab'
import { AppointmentActionsBar } from '../components/appointment-actions-bar'
import { AppointmentHeaderCard } from '../components/appointment-header-card'
import { AppointmentTabs, type AppointmentTabId } from '../components/appointment-tabs'
import { ReassignSheet } from '../components/reassign-sheet'
import { SeriesSheet } from '../components/series-sheet'
import { DocumentSection } from '../../documents/components/document-section'
import {
  useCanIssue,
  useHasProfessionalRecord,
  useMyProfessional,
} from '../../documents/hooks/use-can-issue.hook'
import { PhotoSection } from '../../photos/components/photo-section'
import { VaccineSection } from '../../vaccines/components/vaccine-section'
import { HistoryTab } from '../components/history-tab'
import { ResumoTab } from '../components/resumo-tab'
import { useAppointment } from '../hooks/use-appointment.hook'
import { useAppointmentTabs } from '../hooks/use-appointment-tabs.hook'
import { useCancelAppointment, useCompleteAppointment } from '../hooks/use-appointment-actions.hook'
import { todayIsoDate } from '../utils/agenda-date.util'

/**
 * A consulta, no desenho que a web usa em celular.
 *
 * Cartão-cabeçalho com a paciente em primeiro plano e os dados do atendimento
 * recolhidos, as abas que o papel desta pessoa alcança, e a faixa de ações
 * presa na base — fora da rolagem, porque concluir não pode depender de rolar
 * um prontuário inteiro.
 */
export function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const theme = useTheme()
  const user = useSessionStore((state) => state.user)

  const [tab, setTab] = useState<AppointmentTabId>('resumo')
  const [cancelling, setCancelling] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [reason, setReason] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [viewingSeries, setViewingSeries] = useState(false)

  const { data: appointment, isLoading, isError, refetch } = useAppointment(id)
  const complete = useCompleteAppointment(id)
  const cancel = useCancelAppointment(id)
  // Antes de qualquer retorno antecipado: a contagem de hooks não pode mudar
  // entre o render que carrega e o que mostra.
  const myProfessional = useMyProfessional()
  const canIssue = useCanIssue(appointment?.professionalId)
  // Registrar dose depende da ficha, não de ser o dono do atendimento.
  const hasFicha = useHasProfessionalRecord()

  /**
   * Os dois recortes que governam esta tela, e são o mesmo da web.
   *
   * `canManage` é quem responde pelo atendimento: o ADMIN em qualquer consulta
   * da clínica, o profissional só na dele. A recepção não entra — ela lê a
   * agenda e o resumo, e é tudo. Sem isto o app oferecia a aba Prontuário e os
   * botões de cancelar a ela, e entregava `403` no lugar de ausência.
   */
  const canManage =
    user?.role === UserRole.ADMIN ||
    (user?.role === UserRole.PROFESSIONAL &&
      appointment?.professionalId === myProfessional?.id)

  const canSeeMedicalRecord = canManage

  const tabs = useAppointmentTabs({
    appointmentId: id,
    canSeeMedicalRecord,
    canManage,
  })

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

  // O backend aceita concluir e cancelar em agendada **ou** confirmada.
  const isOpen =
    appointment.status === AppointmentStatus.SCHEDULED ||
    appointment.status === AppointmentStatus.CONFIRMED

  const canAct = canManage && isOpen
  const canReassign =
    user?.role === UserRole.ADMIN &&
    appointment.status === AppointmentStatus.SCHEDULED &&
    !appointment.seriesId
  // A aba aberta pode ter deixado de existir — acontece quando a consulta
  // termina de carregar e o recorte de papel encolhe a fileira.
  const activeTab = tabs.some((item) => item.id === tab) ? tab : 'resumo'

  return (
    <Screen testID="appointment-detail-screen" edges={['top']}>
      <ScreenScroll>
        <AppointmentHeaderCard
          appointment={appointment}
          canSetLabel={canManage}
          onBack={() => router.back()}
          onViewSeries={() => setViewingSeries(true)}
        />

        <AppointmentTabs tabs={tabs} activeId={activeTab} onChange={setTab} />

        {activeTab === 'resumo' ? (
          <ResumoTab appointment={appointment} tabs={tabs} onNavigate={setTab} />
        ) : null}

        {activeTab === 'prontuario' ? (
          <MedicalRecordTab
            appointmentId={id}
            specialtyId={appointment.specialtyId}
            appointmentStatus={appointment.status}
            canManage={canManage}
          />
        ) : null}

        {activeTab === 'historico' ? (
          <HistoryTab
            patientId={appointment.patientId}
            specialtyId={appointment.specialtyId}
            appointmentId={id}
          />
        ) : null}

        {activeTab === 'receitas' ? (
          <DocumentSection kind="receita" appointmentId={id} canManage={canManage} canIssue={canIssue} />
        ) : null}

        {activeTab === 'atestados' ? (
          <DocumentSection kind="atestado" appointmentId={id} canManage={canManage} canIssue={canIssue} />
        ) : null}

        {activeTab === 'exames' ? (
          <DocumentSection kind="exame" appointmentId={id} canManage={canManage} canIssue={canIssue} />
        ) : null}

        {activeTab === 'fotos' ? (
          <PhotoSection appointmentId={id} canIssue={canIssue} />
        ) : null}

        {activeTab === 'vacinas' ? (
          <VaccineSection
            appointmentId={id}
            patientId={appointment.patientId}
            canIssue={canIssue}
            hasFicha={hasFicha}
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

        {/* Concluir pede confirmação como na web: não há como desfazer, e o
            botão fica a um toque de distância na faixa inferior. */}
        {completing ? (
          <Card testID="complete-card">
            <CardTitle>Concluir consulta</CardTitle>
            <Text style={[styles.notice, { color: theme.textDim }]}>
              Tem certeza que deseja concluir esta consulta? Esta ação não pode ser desfeita.
            </Text>
            <Button
              label="Concluir consulta"
              loading={complete.isPending}
              onPress={() => complete.mutate(undefined, { onSuccess: () => setCompleting(false) })}
              testID="confirm-complete"
            />
            <Button
              label="Voltar"
              variant="outline"
              onPress={() => setCompleting(false)}
              testID="abort-complete"
            />
          </Card>
        ) : null}

        {complete.isError || cancel.isError ? (
          <Text style={[styles.notice, { color: theme.danger }]} testID="action-error">
            Não foi possível concluir a ação. Tente de novo.
          </Text>
        ) : null}
      </ScreenScroll>

      {canAct ? (
        <AppointmentActionsBar
          // Concluir consulta futura o backend recusa com 422.
          canComplete={appointment.date <= todayIsoDate()}
          isCompleting={complete.isPending}
          isCancelling={cancel.isPending}
          canReassign={canReassign}
          onReassign={() => setReassigning(true)}
          onCancel={() => setCancelling(true)}
          onComplete={() => setCompleting(true)}
        />
      ) : null}

      {/* A série tem um profissional só — a checagem de posse ao cancelar
          "esta e as futuras" depende disso —, então o backend recusa trocar
          uma ocorrência com 422. Oferecer o botão daria erro garantido. */}
      <ReassignSheet
        appointmentId={id}
        isOpen={reassigning && canReassign}
        onClose={() => setReassigning(false)}
      />

      {appointment.seriesId ? (
        <SeriesSheet
          seriesId={appointment.seriesId}
          currentAppointmentId={id}
          isOpen={viewingSeries}
          onClose={() => setViewingSeries(false)}
          onSelect={(appointmentId) => {
            setViewingSeries(false)
            router.push(`/(app)/appointments/${appointmentId}`)
          }}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  notice: { fontSize: 13, textAlign: 'center' },
})
