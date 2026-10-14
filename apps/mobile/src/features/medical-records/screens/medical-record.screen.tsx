import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import type { IRecordFieldModel } from '@app/core'
import { Card, CardTitle } from '../../../components/ui/card'
import { ChoiceField } from '../../../components/ui/fields'
import { EmptyState, ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useAppointment } from '../../appointments/hooks/use-appointment.hook'
import { useTheme } from '../../../theme/theme-context'
import { RecordForm } from '../components/record-form'
import {
  useActiveTemplates,
  useMedicalRecordByAppointment,
  useSaveMedicalRecord,
} from '../hooks/use-medical-record.hook'

/**
 * O prontuário da consulta: ver, preencher, corrigir.
 *
 * Esta tela decide **se** há o que preencher — carregando, falhou, sem modelo
 * disponível, qual modelo usar. O formulário em si é do `RecordForm`, que só
 * existe depois que há um schema.
 *
 * O modelo não vem do servidor: a clínica pode ter vários no mesmo escopo
 * (primeira consulta, retorno, pré-natal), e qual deles usar é decisão de quem
 * atende, a cada atendimento. Num prontuário que já existe o seletor some — o
 * schema fica congelado no registro, e trocá-lo descartaria o que foi escrito.
 */
export function MedicalRecordScreen() {
  const { id: appointmentId } = useLocalSearchParams<{ id: string }>()
  const appointment = useAppointment(appointmentId)
  const record = useMedicalRecordByAppointment(appointmentId)
  const templates = useActiveTemplates(appointment.data?.specialtyId ?? null)
  const save = useSaveMedicalRecord(appointmentId)

  const [templateId, setTemplateId] = useState<string | null>(null)
  const theme = useTheme()

  // Derivados com o fallback aqui, e não espalhado pelo corpo: durante o
  // carregamento `data` é mesmo `undefined`, e é o único lugar onde isso
  // precisa ser dito.
  const available = templates.data ?? []
  const saved = record.data ?? null
  const chosen = available.find((template) => template.id === templateId) ?? null

  if (appointment.isLoading || record.isLoading || templates.isLoading) {
    return (
      <Screen testID="medical-record-screen">
        <LoadingState testID="medical-record-loading" />
      </Screen>
    )
  }

  if (appointment.isError || record.isError || templates.isError) {
    return (
      <Screen testID="medical-record-screen">
        <ErrorState
          testID="medical-record-error"
          message="Não foi possível carregar o prontuário."
          onRetry={() => {
            void record.refetch()
            void templates.refetch()
          }}
        />
      </Screen>
    )
  }

  // Profissional sem ficha não tem escopo, e sem escopo não há modelo. Dizer
  // isso é melhor do que uma lista vazia, que se lê como falha de carregamento.
  if (!saved && available.length === 0) {
    return (
      <Screen testID="medical-record-screen">
        <EmptyState
          testID="medical-record-no-template"
          message="Nenhum modelo de prontuário disponível para esta consulta."
        />
      </Screen>
    )
  }

  // O schema do registro é o que está congelado nele; o do modelo só entra
  // quando ainda não há registro.
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
    <Screen testID="medical-record-screen" edges={['top']}>
      <ScreenScroll testID="medical-record-form">
        {saved ? null : (
          <Card testID="template-picker">
            <CardTitle>Modelo</CardTitle>
            <ChoiceField
              label="Qual modelo usar nesta consulta"
              required
              options={available.map((template) => ({
                value: template.id,
                label: template.name,
              }))}
              selected={templateId ? [templateId] : []}
              onToggle={setTemplateId}
              testID="template-choice"
            />
          </Card>
        )}

        {schema ? (
          <RecordForm
            // Trocar de modelo remonta o formulário: as chaves de campo são de
            // outro schema, e manter o digitado gravaria valor sob uma chave
            // que o novo modelo não tem.
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
          <View testID="awaiting-template">
            <Text style={[styles.hint, { color: theme.textDim }]}>Escolha um modelo para começar.</Text>
          </View>
        )}

        {save.isError ? (
          <Text style={[styles.warning, { color: theme.danger }]} testID="save-error">
            Não foi possível salvar o prontuário. Tente de novo.
          </Text>
        ) : null}

        {save.isSuccess ? (
          <Text style={[styles.success, { color: theme.good }]} testID="save-success">
            Prontuário salvo.
          </Text>
        ) : null}
      </ScreenScroll>
    </Screen>
  )
}

const styles = StyleSheet.create({
  warning: { fontSize: 14, textAlign: 'center' },
  success: { fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
})
