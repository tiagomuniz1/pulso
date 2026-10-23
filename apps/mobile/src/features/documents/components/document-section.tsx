import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { ExamResults } from '../../exames/components/exam-results'
import {
  createErrorMessage,
  DOCUMENT_KINDS,
  useCreateDocument,
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  type DocumentKind,
} from '../hooks/use-documents.hook'
import { AtestadoForm } from './atestado-form'
import { ExamRequestForm } from './exam-request-form'
import { PrescriptionForm } from './prescription-form'

/**
 * Uma aba de documento: receitas, atestados ou pedidos de exame.
 *
 * Fora do cartão, como a web desenha estas três — título, subtítulo e a lista
 * solta sobre o fundo.
 *
 * O botão de emitir só aparece para quem tem ficha de profissional **e** é o
 * profissional desta consulta — todo documento sai com o bloco de assinatura
 * de quem o emitiu, e assinar sobre consulta alheia poria o registro de uma
 * pessoa num documento que ela não redigiu.
 */
export function DocumentSection({
  kind,
  appointmentId,
  canManage,
  canIssue,
}: {
  kind: DocumentKind
  appointmentId: string
  canManage: boolean
  canIssue: boolean
}) {
  const theme = useTheme()
  const config = DOCUMENT_KINDS[kind]
  const [isFormOpen, setFormOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useDocuments(kind, appointmentId)
  const remove = useDeleteDocument(kind, appointmentId)
  const download = useDownloadDocument(kind)
  const create = useCreateDocument(kind, appointmentId)

  const documents = data ?? []
  const createError = createErrorMessage(kind, create.error)

  function submit(input: unknown) {
    create.mutate(input, { onSuccess: () => setFormOpen(false) })
  }

  const formProps = {
    appointmentId,
    isOpen: isFormOpen,
    isSaving: create.isPending,
    onClose: () => setFormOpen(false),
    onSubmit: submit,
  }

  return (
    <View style={styles.wrapper} testID={`document-section-${kind}`}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMute }]}>{config.subtitle}</Text>
        </View>
        {canIssue ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setFormOpen(true)}
            testID={`document-new-${kind}`}
            style={[
              styles.newButton,
              { borderRadius: theme.radius.md, backgroundColor: theme.accentSoft },
            ]}
          >
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
              {config.newLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? <LoadingState testID={`document-${kind}-loading`} /> : null}

      {isError ? (
        <ErrorState
          testID={`document-${kind}-error`}
          message={`Não foi possível carregar ${config.title.toLowerCase()}.`}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && documents.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID={`document-${kind}-empty`}>
          {config.empty}
        </Text>
      ) : null}

      {documents.map((document) => (
        <View
          key={document.id}
          style={[styles.item, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
          testID={`document-item-${document.id}`}
        >
          <Text style={[styles.itemDate, { color: theme.text }]}>
            {document.issuedAt.toLocaleDateString('pt-BR')}{' '}
            <Text style={{ color: theme.textMute, fontWeight: '400' }}>
              {document.issuedAt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Text>
          <Text style={[styles.itemSummary, { color: theme.textMute }]}>{document.summary}</Text>

          {/* Só o pedido de exames tem caminho de volta — ver `IDocumentRow`. */}
          {kind === 'exame' ? (
            <ExamResults
              examRequestId={document.id}
              appointmentId={appointmentId}
              results={document.results}
              canIssue={canIssue}
            />
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: download.isPending && download.variables === document.id }}
              disabled={download.isPending}
              onPress={() => download.mutate(document.id)}
              testID={`document-download-${document.id}`}
              style={[styles.action, { borderRadius: theme.radius.md, borderColor: theme.line }]}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>Baixar PDF</Text>
            </Pressable>

            {canManage ? (
              <Pressable
                accessibilityRole="button"
                disabled={remove.isPending}
                onPress={() => remove.mutate(document.id)}
                testID={`document-delete-${document.id}`}
                style={[styles.action, { borderRadius: theme.radius.md, borderColor: theme.danger }]}
              >
                <Text style={{ color: theme.danger, fontSize: 13 }}>Excluir</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}

      {download.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID={`document-${kind}-download-error`}>
          Não foi possível baixar o arquivo. Tente de novo.
        </Text>
      ) : null}

      {createError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID={`document-${kind}-create-error`}>
          {createError}
        </Text>
      ) : null}

      {kind === 'receita' ? <PrescriptionForm {...formProps} /> : null}
      {kind === 'atestado' ? <AtestadoForm {...formProps} /> : null}
      {kind === 'exame' ? <ExamRequestForm {...formProps} /> : null}

      {remove.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID={`document-${kind}-delete-error`}>
          Não foi possível excluir. Tente de novo.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  newButton: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13, marginBottom: 4 },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { borderWidth: 1, padding: 16, gap: 4 },
  itemDate: { fontSize: 14, fontWeight: '500' },
  itemSummary: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  action: {
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { fontSize: 13, textAlign: 'center' },
})
