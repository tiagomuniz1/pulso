import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { IExamResultModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import {
  pickExamResultFiles,
  useAddExamResult,
  useDeleteExamResult,
  useDownloadExamResult,
} from '../hooks/use-exam-results.hook'

/** "1,4 MB" — o tamanho só serve para a pessoa decidir se baixa agora. */
function formatSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024)
  if (megabytes >= 1) return `${megabytes.toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Os resultados anexados a um pedido de exames.
 *
 * O pedido é documento emitido — sai assinado e com QR nenhum —, e o
 * resultado é o caminho de volta: o laudo que o laboratório devolveu ou a
 * foto do papel que a paciente trouxe. Por isso anexar segue a mesma regra
 * de emitir, e não a de ler.
 */
export function ExamResults({
  examRequestId,
  appointmentId,
  results,
  canIssue,
}: {
  examRequestId: string
  appointmentId: string
  results: IExamResultModel[]
  /** Anexar e remover são exercício, como emitir o próprio pedido. */
  canIssue: boolean
}) {
  const theme = useTheme()
  const [error, setError] = useState<string | null>(null)

  const add = useAddExamResult(appointmentId)
  const remove = useDeleteExamResult(appointmentId)
  const download = useDownloadExamResult()

  async function handleAttach() {
    setError(null)
    const picked = await pickExamResultFiles()

    if ('cancelled' in picked) return
    if ('error' in picked) {
      setError(picked.error)
      return
    }

    add.mutate({ examRequestId, files: picked.files })
  }

  return (
    <View style={styles.wrapper} testID={`exam-results-${examRequestId}`}>
      {results.length === 0 ? (
        <Text
          style={[styles.empty, { color: theme.textMute }]}
          testID={`exam-results-empty-${examRequestId}`}
        >
          Nenhum resultado anexado.
        </Text>
      ) : null}

      {results.map((result) => (
        <View
          key={result.id}
          style={[styles.result, { borderRadius: theme.radius.md, borderColor: theme.line }]}
          testID={`exam-result-${result.id}`}
        >
          <View style={styles.resultText}>
            <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
              {result.fileName}
            </Text>
            <Text style={[styles.meta, { color: theme.textMute }]}>
              {formatSize(result.fileSizeBytes)} · {result.createdAt.toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Baixar ${result.fileName}`}
            disabled={download.isPending}
            onPress={() =>
              download.mutate({
                id: result.id,
                fileName: result.fileName,
                mimeType: result.mimeType,
              })
            }
            testID={`exam-result-download-${result.id}`}
            hitSlop={8}
          >
            <Text style={{ color: theme.accent, fontSize: 13 }}>Baixar</Text>
          </Pressable>

          {canIssue ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ${result.fileName}`}
              disabled={remove.isPending}
              onPress={() => remove.mutate(result.id)}
              testID={`exam-result-remove-${result.id}`}
              hitSlop={8}
            >
              <Text style={{ color: theme.danger, fontSize: 13 }}>Remover</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {canIssue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: add.isPending }}
          disabled={add.isPending}
          onPress={() => void handleAttach()}
          testID={`exam-result-attach-${examRequestId}`}
          style={[
            styles.attach,
            {
              borderRadius: theme.radius.md,
              borderColor: theme.line,
              opacity: add.isPending ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.text, fontSize: 13 }}>
            {add.isPending ? 'Enviando...' : '+ Anexar resultado'}
          </Text>
        </Pressable>
      ) : null}

      {error ? (
        <Text
          style={[styles.notice, { color: theme.danger }]}
          testID={`exam-result-validation-error-${examRequestId}`}
        >
          {error}
        </Text>
      ) : null}

      {add.isError ? (
        <Text
          style={[styles.notice, { color: theme.danger }]}
          testID={`exam-result-upload-error-${examRequestId}`}
        >
          {add.error?.status === 403
            ? 'Você não tem permissão para anexar resultados a este pedido.'
            : 'Ocorreu um erro ao anexar o resultado. Tente novamente.'}
        </Text>
      ) : null}

      {remove.isError ? (
        <Text
          style={[styles.notice, { color: theme.danger }]}
          testID={`exam-result-remove-error-${examRequestId}`}
        >
          Não foi possível remover o resultado. Tente de novo.
        </Text>
      ) : null}

      {download.isError ? (
        <Text
          style={[styles.notice, { color: theme.danger }]}
          testID={`exam-result-download-error-${examRequestId}`}
        >
          Não foi possível baixar o arquivo. Tente de novo.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6, marginTop: 4 },
  empty: { fontSize: 12 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  resultText: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '500' },
  meta: { fontSize: 11 },
  attach: {
    borderWidth: 1,
    borderStyle: 'dashed',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { fontSize: 12 },
})
