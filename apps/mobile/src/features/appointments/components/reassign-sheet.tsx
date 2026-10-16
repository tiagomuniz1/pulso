import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '../../../components/ui/button'
import { SelectField } from '../../../components/ui/select-field'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import {
  useReassignAppointment,
  useReassignCandidates,
} from '../hooks/use-appointment-actions.hook'

/**
 * Trocar o profissional da consulta.
 *
 * A lista vem do servidor já recortada: só quem exerce a mesma especialidade
 * (ou profissão) e está livre neste mesmo horário. Data e hora não mudam.
 */
export function ReassignSheet({
  appointmentId,
  isOpen,
  onClose,
}: {
  appointmentId: string
  isOpen: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const [selectedId, setSelectedId] = useState('')

  const candidates = useReassignCandidates(appointmentId, isOpen)
  const reassign = useReassignAppointment(appointmentId)

  const list = candidates.data ?? []

  const message =
    reassign.error?.status === 422
      ? 'Este profissional não está disponível para esta consulta. Escolha outro.'
      : reassign.error?.status === 409
        ? 'O horário deste profissional acabou de ser preenchido. Escolha outro.'
        : reassign.error
          ? 'Ocorreu um erro ao trocar o profissional. Tente novamente.'
          : null

  return (
    <DocumentSheet
      title="Trocar profissional"
      isOpen={isOpen}
      onClose={onClose}
      testID="reassign-sheet"
      footer={
        <Button
          label="Trocar profissional"
          disabled={!selectedId}
          loading={reassign.isPending}
          onPress={() => reassign.mutate(selectedId, { onSuccess: onClose })}
          testID="reassign-submit"
        />
      }
    >
      <Text style={[styles.intro, { color: theme.textDim }]}>
        Selecione um profissional da mesma especialidade ou profissão que esteja disponível neste
        mesmo horário. A data e o horário da consulta são mantidos.
      </Text>

      {candidates.isLoading ? <LoadingState testID="reassign-loading" /> : null}

      {candidates.isError ? (
        <ErrorState
          testID="reassign-error"
          message="Erro ao carregar os profissionais disponíveis."
          onRetry={() => void candidates.refetch()}
        />
      ) : null}

      {!candidates.isLoading && !candidates.isError && list.length === 0 ? (
        <Text style={{ color: theme.warn, fontSize: 13 }} testID="reassign-empty">
          Nenhum profissional disponível para este horário.
        </Text>
      ) : null}

      {list.length > 0 ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Profissional</Text>
          <SelectField
            value={selectedId || null}
            options={list.map((candidate) => ({
              value: candidate.professionalId,
              label: candidate.specialtyName
                ? `${candidate.professionalName} — ${candidate.specialtyName}`
                : candidate.professionalName,
            }))}
            onChange={setSelectedId}
            placeholder="Selecione um profissional"
            testID="reassign-professional"
          />
        </View>
      ) : null}

      {message ? (
        <Text style={{ color: theme.danger, fontSize: 13 }} testID="reassign-submit-error">
          {message}
        </Text>
      ) : null}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  intro: { fontSize: 13 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
})
