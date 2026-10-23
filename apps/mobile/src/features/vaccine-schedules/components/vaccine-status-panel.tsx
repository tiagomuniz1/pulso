import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import type { IPatientVaccineStatusItem } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { Badge } from '../../../components/ui/list-screen'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { SelectField } from '../../../components/ui/select-field'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useMyProfessional } from '../../documents/hooks/use-can-issue.hook'
import { useTheme } from '../../../theme/theme-context'
import {
  countPending,
  doseSummary,
  pendingSummary,
  sortByUrgency,
  VACCINE_STATUS_LABELS,
  VACCINE_STATUS_TONES,
} from '../utils/vaccine-status.util'
import {
  usePatientVaccineStatus,
  useRecordVaccineDecision,
} from '../hooks/use-vaccine-schedules.hook'

const DECISION_OPTIONS = [
  { value: VaccineDecision.CONFIRMADA, label: 'Vai ser aplicada' },
  { value: VaccineDecision.ADIADA, label: 'Adiar' },
  { value: VaccineDecision.DISPENSADA, label: 'Não se aplica a esta paciente' },
]

/**
 * A situação vacinal do paciente pelo calendário.
 *
 * **O sistema informa, não prescreve.** Ele diz "pendente pelo
 * calendário" e a palavra final é de quem atende, registrada como conduta
 * com o motivo — sem isso, contraindicação e esquema especial virariam
 * alerta permanente e errado na tela da paciente.
 *
 * Registrar conduta é ato clínico e depende da **ficha**, como registrar
 * uma dose: cargo administrativo sozinho não decide sobre esquema vacinal.
 */
export function VaccineStatusPanel({ patientId }: { patientId: string }) {
  const theme = useTheme()
  const myProfessional = useMyProfessional()
  const canDecide = Boolean(myProfessional)

  const { data, isPending, isError, refetch } = usePatientVaccineStatus(patientId)
  const record = useRecordVaccineDecision(patientId)

  const [deciding, setDeciding] = useState<IPatientVaccineStatusItem | null>(null)
  const [decision, setDecision] = useState<VaccineDecision>(VaccineDecision.ADIADA)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const items = sortByUrgency(data?.items ?? [])

  function openDecision(item: IPatientVaccineStatusItem) {
    setDeciding(item)
    setDecision(item.decision ?? VaccineDecision.ADIADA)
    setReason(item.decisionReason ?? '')
    setError(null)
  }

  function confirmDecision(item: IPatientVaccineStatusItem) {
    // Dispensar e adiar exigem motivo; confirmar não, porque é só
    // reconhecer o que o calendário disse.
    if (decision !== VaccineDecision.CONFIRMADA && !reason.trim()) {
      setError('Informe o motivo — ele fica registrado junto da decisão.')
      return
    }

    record.mutate(
      {
        patientId,
        vaccineId: item.vaccineId,
        decision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      {
        onSuccess: () => setDeciding(null),
        onError: () => setError('Não foi possível registrar a conduta. Tente de novo.'),
      },
    )
  }

  return (
    <View style={styles.wrapper} testID="vaccine-status-panel">
      <Text style={[styles.title, { color: theme.text }]}>Situação vacinal</Text>

      {!isPending && !isError && data ? (
        <Text style={[styles.summary, { color: theme.textDim }]} testID="vaccine-status-summary">
          {pendingSummary(data.ageInMonths, countPending(items))}
        </Text>
      ) : null}

      <Text style={[styles.disclaimer, { color: theme.textMute }]} testID="vaccine-status-disclaimer">
        Sugestão baseada no calendário cadastrado. A conduta é do profissional.
      </Text>

      {isPending ? <LoadingState testID="vaccine-status-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="vaccine-status-error"
          message="Não foi possível calcular a situação vacinal."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && items.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textDim }]} testID="vaccine-status-empty">
          Nenhuma vacina do calendário se aplica a este paciente.
        </Text>
      ) : null}

      {items.map((item) => (
        <View
          key={item.vaccineId}
          style={[styles.item, { borderColor: theme.line, borderRadius: theme.radius.md }]}
          testID={`vaccine-status-item-${item.vaccineId}`}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.vaccineName}</Text>
            <Badge
              label={VACCINE_STATUS_LABELS[item.status]}
              tone={VACCINE_STATUS_TONES[item.status]}
              testID={`vaccine-status-badge-${item.vaccineId}`}
            />
          </View>

          <Text style={[styles.itemMeta, { color: theme.textDim }]}>{doseSummary(item)}</Text>

          {item.decisionReason ? (
            <Text
              style={[styles.itemMeta, { color: theme.textMute }]}
              testID={`vaccine-decision-reason-${item.vaccineId}`}
            >
              {item.decidedByProfessionalName}: {item.decisionReason}
            </Text>
          ) : null}

          {canDecide && item.status !== VaccineScheduleStatus.EM_DIA ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => openDecision(item)}
              testID={`vaccine-decide-${item.vaccineId}`}
            >
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                Registrar conduta
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {deciding ? (
        <DocumentSheet
          title={`Conduta — ${deciding.vaccineName}`}
          isOpen
          onClose={() => setDeciding(null)}
          testID="vaccine-decision-dialog"
          footer={
            <Button
              label="Registrar"
              loading={record.isPending}
              onPress={() => confirmDecision(deciding)}
              testID="vaccine-decision-confirm"
            />
          }
        >
          {error ? (
            <Text style={[styles.error, { color: theme.danger }]} testID="vaccine-decision-error">
              {error}
            </Text>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Decisão</Text>
            <SelectField
              value={decision}
              options={DECISION_OPTIONS}
              onChange={(value) => setDecision(value as VaccineDecision)}
              placeholder="Decisão"
              testID="vaccine-decision-select"
            />
          </View>

          <TextField
            label={
              decision === VaccineDecision.CONFIRMADA ? 'Motivo' : 'Motivo (obrigatório)'
            }
            value={reason}
            onChange={setReason}
            multiline
            placeholder="O motivo fica registrado junto da decisão..."
            testID="vaccine-decision-reason"
          />
        </DocumentSheet>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
  summary: { fontSize: 13 },
  disclaimer: { fontSize: 11 },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { borderWidth: 1, padding: 12, gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 12 },
  error: { fontSize: 13 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
})
