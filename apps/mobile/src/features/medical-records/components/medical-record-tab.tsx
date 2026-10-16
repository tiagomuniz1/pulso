import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppointmentStatus } from '@app/shared'
import type { IRecordFieldModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { Card, CardTitle } from '../../../components/ui/card'
import { ChoiceField } from '../../../components/ui/fields'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { RecordForm } from './record-form'
import { RecordView } from './record-view'
import {
  useActiveTemplates,
  useDownloadMedicalRecordPdf,
  useMedicalRecordByAppointment,
  useSaveMedicalRecord,
} from '../hooks/use-medical-record.hook'

/**
 * O prontuário como aba da consulta, e não como tela separada.
 *
 * Era uma rota própria no app; na web é a segunda aba, ao lado do resumo —
 * sair da consulta para preencher e voltar para concluir é um caminho que o
 * desenho da web não pede.
 */
export function MedicalRecordTab({
  appointmentId,
  specialtyId,
  appointmentStatus,
  canManage,
}: {
  appointmentId: string
  specialtyId: string | null
  appointmentStatus: AppointmentStatus
  /** Escrever é do ADMIN e do profissional desta consulta; ler é de quem chega aqui. */
  canManage: boolean
}) {
  const theme = useTheme()
  const record = useMedicalRecordByAppointment(appointmentId)
  const templates = useActiveTemplates(specialtyId)
  const save = useSaveMedicalRecord(appointmentId)
  const download = useDownloadMedicalRecordPdf()

  const [templateId, setTemplateId] = useState<string | null>(null)

  const available = templates.data ?? []
  const saved = record.data ?? null
  const chosen = available.find((template) => template.id === templateId) ?? null
  // O backend bloqueia a edição depois da consulta concluída (`422`).
  const isCompleted = appointmentStatus === AppointmentStatus.COMPLETED
  const canEdit = canManage && !isCompleted

  if (record.isLoading || templates.isLoading) {
    return <LoadingState testID="medical-record-loading" />
  }

  if (record.isError || templates.isError) {
    return (
      <ErrorState
        testID="medical-record-error"
        message="Não foi possível carregar o prontuário."
        onRetry={() => {
          void record.refetch()
          void templates.refetch()
        }}
      />
    )
  }

  /**
   * O estado vazio da web, com as duas frases que ela escreve.
   *
   * A segunda só aparece quando não há modelo: é a diferença entre "ninguém
   * preencheu ainda" e "não dá para preencher" — e a segunda tem destinatário,
   * que é o administrador da clínica.
   */
  if (!saved && (!canEdit || available.length === 0)) {
    return (
      <Card testID="medical-record-empty">
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          Prontuário ainda não preenchido
        </Text>
        <Text style={[styles.emptyText, { color: theme.textDim }]}>
          Registre evolução, hipótese diagnóstica e conduta da consulta.
        </Text>
        {canEdit ? (
          <Text
            style={[styles.emptyText, { color: theme.textDim }]}
            testID="medical-record-no-template"
          >
            Nenhum modelo de prontuário cadastrado para esta especialidade. Peça ao administrador
            da clínica para cadastrar um.
          </Text>
        ) : null}
      </Card>
    )
  }

  /**
   * Prontuário existente e fechado para edição.
   *
   * Baixar continua: é leitura, e o PDF do prontuário sai sem bloco de
   * assinatura — serve para arquivar e encaminhar.
   */
  if (saved && !canEdit) {
    return (
      <View style={styles.wrapper} testID="medical-record-tab">
        <RecordView record={saved} />
        <Button
          label="Baixar PDF"
          variant="outline"
          loading={download.isPending}
          onPress={() => download.mutate(saved.id)}
          testID="download-medical-record"
        />
        {download.isError ? (
          <Text style={[styles.notice, { color: theme.danger }]} testID="download-error">
            Não foi possível baixar o PDF. Tente de novo.
          </Text>
        ) : null}
      </View>
    )
  }

  const schema: IRecordFieldModel[] | null = saved
    ? saved.schema
    : chosen
      ? chosen.fields.map((field, index) => ({
          key: field.key ?? field.canonicalKey ?? String(index),
          label: field.label,
          type: field.type,
          required: field.required,
          order: field.order,
          options: field.options,
          placeholder: field.placeholder,
          helpText: field.helpText,
          sectionKey: field.sectionKey,
        }))
      : null

  return (
    <View style={styles.wrapper} testID="medical-record-tab">
      {saved ? null : (
        <Card testID="template-picker">
          <CardTitle>Modelo</CardTitle>
          <ChoiceField
            label="Qual modelo usar nesta consulta"
            required
            options={available.map((template) => ({ value: template.id, label: template.name }))}
            selected={templateId ? [templateId] : []}
            onToggle={setTemplateId}
            testID="template-choice"
          />
        </Card>
      )}

      {schema ? (
        <RecordForm
          // Trocar de modelo remonta o formulário: as chaves são de outro
          // schema, e manter o digitado gravaria valor sob chave inexistente.
          key={saved?.id ?? templateId}
          schema={schema}
          sections={chosen?.sections ?? []}
          savedData={saved?.data ?? null}
          savedNotes={saved?.notes ?? ''}
          isExisting={Boolean(saved)}
          isSaving={save.isPending}
          onSave={(data, notes) =>
            save.mutate({
              recordId: saved?.id ?? null,
              appointmentId,
              templateId: saved?.templateId ?? String(templateId),
              data,
              notes,
            })
          }
        />
      ) : (
        <Card testID="awaiting-template">
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Prontuário ainda não preenchido
          </Text>
          <Text style={[styles.emptyText, { color: theme.textDim }]}>
            Escolha um modelo para registrar evolução, hipótese diagnóstica e conduta.
          </Text>
        </Card>
      )}

      {save.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="save-error">
          Não foi possível salvar o prontuário. Tente de novo.
        </Text>
      ) : null}

      {save.isSuccess ? (
        <Text style={[styles.notice, { color: theme.good }]} testID="save-success">
          Prontuário salvo.
        </Text>
      ) : null}

      {saved ? (
        <>
          <Button
            label="Baixar PDF"
            variant="outline"
            loading={download.isPending}
            onPress={() => download.mutate(saved.id)}
            testID="download-medical-record"
          />
          {download.isError ? (
            <Text style={[styles.notice, { color: theme.danger }]} testID="download-error">
              Não foi possível baixar o PDF. Tente de novo.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  notice: { fontSize: 13, textAlign: 'center' },
})
