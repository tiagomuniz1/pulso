import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import {
  addExamResultUseCase,
  deleteExamResultUseCase,
  type IApiError,
  type UploadFile,
} from '@app/core'
import { downloadAndShareDocument } from '../../../lib/document-download'

/**
 * Os tipos que o backend aceita como resultado, e o limite por arquivo.
 *
 * Os mesmos da web (`exame-result-upload.tsx`): o resultado chega ou como
 * PDF do laboratório, ou como foto do papel que a paciente trouxe.
 */
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAXIMUM_SIZE_IN_BYTES = 10 * 1024 * 1024

export const EXAM_RESULT_LIMITS = { ACCEPTED_TYPES, MAXIMUM_SIZE_IN_BYTES }

/** O que o seletor devolveu, ou o motivo de não ter devolvido nada. */
export type PickedResult =
  | { files: UploadFile[] }
  | { error: string }
  | { cancelled: true }

/**
 * Abre o seletor de arquivos do sistema.
 *
 * Aceita PDF e imagem porque as duas coisas chegam: o laudo do laboratório
 * e a foto do papel. A validação é a mesma da web — o backend recusaria
 * depois, e recusar aqui poupa o upload de 10 MB para nada.
 */
export async function pickExamResultFiles(): Promise<PickedResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ACCEPTED_TYPES,
    multiple: true,
    copyToCacheDirectory: true,
  })

  if (result.canceled) return { cancelled: true }

  // Sem `?? []`: o tipo do picker garante a lista quando não foi cancelado.
  const { assets } = result

  if (assets.some((asset) => asset.mimeType && !ACCEPTED_TYPES.includes(asset.mimeType))) {
    return { error: 'Tipo inválido. Utilize PDF, JPEG, PNG ou WebP.' }
  }

  if (assets.some((asset) => (asset.size ?? 0) > MAXIMUM_SIZE_IN_BYTES)) {
    return { error: 'Arquivo muito grande. O limite é 10MB por arquivo.' }
  }

  return {
    files: assets.map((asset, index) => ({
      uri: asset.uri,
      // O seletor nem sempre devolve nome — depende do provedor de arquivos.
      name: asset.name || `resultado-${Date.now()}-${index}.pdf`,
      type: asset.mimeType || 'application/pdf',
    })),
  }
}

export function useAddExamResult(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, IApiError, { examRequestId: string; files: UploadFile[] }>({
    mutationFn: ({ examRequestId, files }) => addExamResultUseCase(examRequestId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', 'exame', appointmentId] })
    },
  })
}

export function useDeleteExamResult(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteExamResultUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', 'exame', appointmentId] })
    },
  })
}

/**
 * Baixa o anexo e entrega à folha de compartilhamento.
 *
 * O nome do arquivo vem do registro, e não inventado: é por ele que a
 * pessoa reconhece o laudo depois de salvo.
 */
export function useDownloadExamResult() {
  return useMutation<void, Error, { id: string; fileName: string; mimeType: string }>({
    mutationFn: ({ id, fileName, mimeType }) =>
      downloadAndShareDocument(`/exam-results/${id}/file`, fileName, mimeType),
  })
}
