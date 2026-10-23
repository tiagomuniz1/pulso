import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAtestadoUseCase,
  createExamRequestUseCase,
  createPrescriptionUseCase,
  deleteAtestadoUseCase,
  deleteExamRequestUseCase,
  deletePrescriptionUseCase,
  listAtestadosUseCase,
  listExamRequestsUseCase,
  listPrescriptionsUseCase,
  type IApiError,
  type IExamResultModel,
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
  /** O rótulo do botão que abre o formulário, como na web. */
  newLabel: string
  create: (input: never) => Promise<unknown>
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
    newLabel: '+ Nova receita',
    create: createPrescriptionUseCase as (input: never) => Promise<unknown>,
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
    newLabel: '+ Novo atestado',
    create: createAtestadoUseCase as (input: never) => Promise<unknown>,
  },
  exame: {
    title: 'Exames',
    subtitle: 'Exames solicitados nesta consulta.',
    empty: 'Nenhum exame solicitado.',
    summary: (document: never) => {
      const { items, results } = document as { items: unknown[]; results: unknown[] }
      const exams = `${items.length} ${items.length === 1 ? 'exame' : 'exames'}`
      const attached =
        results.length > 0
          ? `${results.length} ${results.length === 1 ? 'resultado anexado' : 'resultados anexados'}`
          : 'nenhum resultado anexado'
      return `${exams} · ${attached}`
    },
    list: listExamRequestsUseCase,
    remove: deleteExamRequestUseCase,
    pdfPath: (id) => `/exam-requests/${id}/pdf`,
    fileName: (id) => `pedido-exame-${id}.pdf`,
    newLabel: '+ Novo pedido de exames',
    create: createExamRequestUseCase as (input: never) => Promise<unknown>,
  },
}

export interface IDocumentRow {
  id: string
  issuedAt: Date
  summary: string
  /**
   * Os anexos, só para o pedido de exames.
   *
   * Receita e atestado são de mão única — saem assinados e acabou. O pedido
   * tem caminho de volta: o laudo que o laboratório devolve, ou a foto do
   * papel que a paciente traz.
   */
  results: IExamResultModel[]
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
        // Só o pedido de exames traz anexo; nos outros a lista é vazia e a
        // seção nem desenha o painel.
        results: (document as { results?: IExamResultModel[] }).results ?? [],
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

/**
 * Emitir.
 *
 * O 422 do backend tem causa conhecida — consulta cancelada — e vale uma
 * frase própria: "tente de novo" seria mentira, porque tentar de novo não
 * descancela nada.
 */
export function useCreateDocument(kind: DocumentKind, appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, IApiError, unknown>({
    mutationFn: (input) => DOCUMENT_KINDS[kind].create(input as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', kind, appointmentId] })
    },
  })
}

export function createErrorMessage(kind: DocumentKind, error: IApiError | null): string | null {
  if (!error) return null
  const what = { receita: 'a receita', atestado: 'o atestado', exame: 'o pedido' }[kind]
  if (error.status === 422) return `Não é possível emitir para uma consulta cancelada.`
  if (error.status === 403) return `Você não tem permissão para emitir ${what}.`
  return `Ocorreu um erro ao emitir ${what}. Tente novamente.`
}
