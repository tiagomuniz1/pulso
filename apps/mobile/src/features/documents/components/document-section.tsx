import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import {
  DOCUMENT_KINDS,
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  type DocumentKind,
} from '../hooks/use-documents.hook'

/**
 * Uma aba de documento: receitas, atestados ou pedidos de exame.
 *
 * Fora do cartão, como a web desenha estas três — título, subtítulo e a lista
 * solta sobre o fundo.
 *
 * **Emitir não está aqui.** Na web o botão "+ Nova receita" só aparece para
 * quem tem ficha de profissional *e* é o profissional desta consulta; o
 * formulário tem 528 linhas e busca no catálogo de medicamentos. Entra no
 * passo seguinte — por ora a aba lê, baixa e exclui, que é o que o
 * profissional faz com o documento depois de emitido.
 */
export function DocumentSection({
  kind,
  appointmentId,
  canManage,
}: {
  kind: DocumentKind
  appointmentId: string
  canManage: boolean
}) {
  const theme = useTheme()
  const config = DOCUMENT_KINDS[kind]

  const { data, isLoading, isError, refetch } = useDocuments(kind, appointmentId)
  const remove = useDeleteDocument(kind, appointmentId)
  const download = useDownloadDocument(kind)

  const documents = data ?? []

  return (
    <View style={styles.wrapper} testID={`document-section-${kind}`}>
      <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
      <Text style={[styles.subtitle, { color: theme.textMute }]}>{config.subtitle}</Text>

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
