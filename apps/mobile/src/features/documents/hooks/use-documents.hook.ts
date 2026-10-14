import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteAtestadoUseCase,
  deleteExamRequestUseCase,
  deletePrescriptionUseCase,
  listAtestadosUseCase,
  listExamRequestsUseCase,
  listPrescriptionsUseCase,
  type IApiError,
} from '@app/core'
import { downloadAndShareDocument } from '../../../lib/document-download'

export type DocumentKind = 'receita' | 'atestado' | 'exame'

/**
 * As três abas de documento num contrato só.
 *
 * Receita, atestado e pedido de exame são entidades diferentes no backend,
 * mas na tela fazem a mesma coisa: listar o que esta consulta emitiu, baixar
 * o PDF e excluir. Três componentes idênticos a menos de um nome seriam três
 * lugares para corrigir o mesmo defeito.
 */
interface DocumentKindConfig {
  title: string
  subtitle: string
  empty: string
  /** Rótulo da linha secundária — o que cada tipo mostra além da data. */
  summary: (document: never) => string
  list: (appointmentId: string) => Promise<unknown[]>
  remove: (id: string) => Promise<void>
  pdfPath: (id: string) => string
  fileName: (id: string) => string
}

export const DOCUMENT_KINDS: Record<DocumentKind, DocumentKindConfig> = {
  receita: {
    title: 'Receitas',
    subtitle: 'Prescrições médicas emitidas nesta consulta.',
    empty: 'Nenhuma receita emitida.',
    summary: (document: never) => {
      const items = (document as { items: unknown[] }).items
      return `${items.length} ${items.length === 1 ? 'medicamento' : 'medicamentos'}`
    },
    list: listPrescriptionsUseCase,
    remove: deletePrescriptionUseCase,
    pdfPath: (id) => `/prescriptions/${id}/pdf`,
    fileName: (id) => `receita-${id}.pdf`,
  },
  atestado: {
    title: 'Atestados',
    subtitle: 'Atestados emitidos nesta consulta.',
    empty: 'Nenhum atestado emitido.',
    summary: (document: never) => {
      const days = (document as { daysOff: number | null }).daysOff
      if (days === null) return 'Sem afastamento'
      return `${days} ${days === 1 ? 'dia de afastamento' : 'dias de afastamento'}`
    },
    list: listAtestadosUseCase,
    remove: deleteAtestadoUseCase,
    pdfPath: (id) => `/atestados/${id}/pdf`,
    fileName: (id) => `atestado-${id}.pdf`,
  },
  exame: {
    title: 'Exames',
    subtitle: 'Exames solicitados nesta consulta.',
    empty: 'Nenhum exame solicitado.',
    summary: (document: never) => {
      const items = (document as { items: unknown[] }).items
      return `${items.length} ${items.length === 1 ? 'exame' : 'exames'}`
    },
    list: listExamRequestsUseCase,
    remove: deleteExamRequestUseCase,
    pdfPath: (id) => `/exam-requests/${id}/pdf`,
    fileName: (id) => `pedido-exame-${id}.pdf`,
  },
}

export interface IDocumentRow {
  id: string
  issuedAt: Date
  summary: string
}

export function useDocuments(kind: DocumentKind, appointmentId: string) {
  const config = DOCUMENT_KINDS[kind]

  return useQuery({
    queryKey: ['documents', kind, appointmentId],
    queryFn: async (): Promise<IDocumentRow[]> => {
      const documents = await config.list(appointmentId)
      return documents.map((document) => ({
        id: (document as { id: string }).id,
        issuedAt: (document as { issuedAt: Date }).issuedAt,
        summary: config.summary(document as never),
      }))
    },
  })
}

export function useDeleteDocument(kind: DocumentKind, appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    // Embrulhado, não passado direto: o React Query chama o `mutationFn` com
    // um segundo argumento de contexto, e o use-case recebe `(id)` só.
    mutationFn: (id) => DOCUMENT_KINDS[kind].remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', kind, appointmentId] })
    },
  })
}

/**
 * Baixar não é uma query: é um efeito que termina na folha de
 * compartilhamento do sistema, e repetir não devolve nada de novo.
 */
export function useDownloadDocument(kind: DocumentKind) {
  const config = DOCUMENT_KINDS[kind]

  return useMutation<void, Error, string>({
    mutationFn: (id) => downloadAndShareDocument(config.pdfPath(id), config.fileName(id)),
  })
}
