import {
  deleteAtestadoUseCase,
  deleteExamRequestUseCase,
  deletePrescriptionUseCase,
  listAtestadosUseCase,
  listExamRequestsUseCase,
  listPrescriptionsUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { downloadAndShareDocument } from '../../../lib/document-download'
import { DocumentSection } from './document-section'

jest.mock('@app/core/src/features/prescriptions/use-cases/list-prescriptions.use-case')
jest.mock('@app/core/src/features/prescriptions/use-cases/delete-prescription.use-case')
jest.mock('@app/core/src/features/atestados/use-cases/list-atestados.use-case')
jest.mock('@app/core/src/features/atestados/use-cases/delete-atestado.use-case')
jest.mock('@app/core/src/features/exames/use-cases/list-exam-requests.use-case')
jest.mock('@app/core/src/features/exames/use-cases/delete-exam-request.use-case')
jest.mock('../../../lib/document-download', () => ({
  downloadAndShareDocument: jest.fn(async () => undefined),
}))

const mockPrescriptions = listPrescriptionsUseCase as jest.MockedFunction<typeof listPrescriptionsUseCase>
const mockAtestados = listAtestadosUseCase as jest.MockedFunction<typeof listAtestadosUseCase>
const mockExames = listExamRequestsUseCase as jest.MockedFunction<typeof listExamRequestsUseCase>
const mockDeleteRx = deletePrescriptionUseCase as jest.MockedFunction<typeof deletePrescriptionUseCase>
const mockDeleteAtestado = deleteAtestadoUseCase as jest.MockedFunction<typeof deleteAtestadoUseCase>
const mockDeleteExame = deleteExamRequestUseCase as jest.MockedFunction<typeof deleteExamRequestUseCase>
const mockDownload = downloadAndShareDocument as jest.MockedFunction<typeof downloadAndShareDocument>

const ISSUED_AT = new Date(2026, 1, 10, 14, 30)

beforeEach(() => {
  jest.clearAllMocks()
  mockPrescriptions.mockResolvedValue([])
  mockAtestados.mockResolvedValue([])
  mockExames.mockResolvedValue([])
})

describe('DocumentSection', () => {
  it('mostra o giro enquanto carrega', async () => {
    mockPrescriptions.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(
      <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
    )

    expect(screen.getByTestId('document-receita-loading')).toBeTruthy()
  })

  it('oferece tentar de novo quando falha', async () => {
    mockPrescriptions.mockRejectedValue(new Error('rede'))

    await renderWithProviders(
      <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
    )
    expect(await screen.findByTestId('document-receita-error')).toBeTruthy()

    mockPrescriptions.mockResolvedValue([])
    fireEvent.press(screen.getByTestId('document-receita-error-retry'))

    expect(await screen.findByTestId('document-receita-empty')).toBeTruthy()
  })

  /**
   * As três abas são a mesma tela a menos de um nome: listar o que a consulta
   * emitiu, baixar o PDF e excluir. Um componente por tipo seriam três
   * lugares para corrigir o mesmo defeito.
   */
  describe.each([
    ['receita' as const, 'Receitas', 'Nenhuma receita emitida.'],
    ['atestado' as const, 'Atestados', 'Nenhum atestado emitido.'],
    ['exame' as const, 'Exames', 'Nenhum exame solicitado.'],
  ])('%s', (kind, title, empty) => {
    it('mostra o título e a mensagem de vazio da web', async () => {
      await renderWithProviders(
        <DocumentSection kind={kind} appointmentId="appt-1" canManage />,
      )

      expect(await screen.findByTestId(`document-${kind}-empty`)).toHaveTextContent(empty)
      expect(screen.getByText(title)).toBeTruthy()
    })
  })

  describe('a linha do documento', () => {
    beforeEach(() => {
      mockPrescriptions.mockResolvedValue([
        { id: 'rx-1', issuedAt: ISSUED_AT, items: [{}, {}] },
      ] as never)
    })

    it('mostra data, hora e a contagem', async () => {
      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )

      const item = await screen.findByTestId('document-item-rx-1')
      expect(item).toHaveTextContent(/10\/02\/2026/)
      expect(item).toHaveTextContent(/2\ medicamentos/)
    })

    // Singular e plural: "1 medicamentos" é o tipo de detalhe que se nota.
    it('usa o singular para um só', async () => {
      mockPrescriptions.mockResolvedValue([{ id: 'rx-1', issuedAt: ISSUED_AT, items: [{}] }] as never)

      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )

      expect(await screen.findByTestId('document-item-rx-1')).toHaveTextContent(/1\ medicamento/)
    })

    it('baixa o PDF', async () => {
      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )
      fireEvent.press(await screen.findByTestId('document-download-rx-1'))

      await waitFor(() =>
        expect(mockDownload).toHaveBeenCalledWith('/prescriptions/rx-1/pdf', 'receita-rx-1.pdf'),
      )
    })

    it('avisa quando o download falha', async () => {
      mockDownload.mockRejectedValue(new Error('sem espaço'))

      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )
      fireEvent.press(await screen.findByTestId('document-download-rx-1'))

      expect(await screen.findByTestId('document-receita-download-error')).toBeTruthy()
    })

    it('exclui', async () => {
      mockDeleteRx.mockResolvedValue(undefined)

      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )
      fireEvent.press(await screen.findByTestId('document-delete-rx-1'))

      await waitFor(() => expect(mockDeleteRx).toHaveBeenCalledWith('rx-1'))
    })

    it('avisa quando excluir falha', async () => {
      mockDeleteRx.mockRejectedValue({ status: 403, title: 'x', detail: 'y' })

      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage />,
      )
      fireEvent.press(await screen.findByTestId('document-delete-rx-1'))

      expect(await screen.findByTestId('document-receita-delete-error')).toBeTruthy()
    })

    // A recepção não acessa dado clínico; baixar segue existindo para quem
    // enxerga o documento, mas excluir é do zelador da clínica.
    it('esconde excluir de quem não gerencia', async () => {
      await renderWithProviders(
        <DocumentSection kind="receita" appointmentId="appt-1" canManage={false} />,
      )
      await screen.findByTestId('document-item-rx-1')

      expect(screen.queryByTestId('document-delete-rx-1')).toBeNull()
      expect(screen.getByTestId('document-download-rx-1')).toBeTruthy()
    })
  })

  describe('o resumo de cada tipo', () => {
    it('o atestado conta os dias de afastamento', async () => {
      mockAtestados.mockResolvedValue([{ id: 'at-1', issuedAt: ISSUED_AT, daysOff: 3 }] as never)

      await renderWithProviders(
        <DocumentSection kind="atestado" appointmentId="appt-1" canManage />,
      )

      expect(await screen.findByTestId('document-item-at-1')).toHaveTextContent(/3 dias de afastamento/)
    })

    it('um dia é singular', async () => {
      mockAtestados.mockResolvedValue([{ id: 'at-1', issuedAt: ISSUED_AT, daysOff: 1 }] as never)

      await renderWithProviders(
        <DocumentSection kind="atestado" appointmentId="appt-1" canManage />,
      )

      expect(await screen.findByTestId('document-item-at-1')).toHaveTextContent(/1 dia de afastamento/)
    })

    // Atestado de comparecimento não afasta ninguém — e `null` não é zero.
    it('atestado sem afastamento diz isso', async () => {
      mockAtestados.mockResolvedValue([{ id: 'at-1', issuedAt: ISSUED_AT, daysOff: null }] as never)

      await renderWithProviders(
        <DocumentSection kind="atestado" appointmentId="appt-1" canManage />,
      )

      expect(await screen.findByTestId('document-item-at-1')).toHaveTextContent(/Sem\ afastamento/)
    })

    it('o pedido de exame conta os exames', async () => {
      mockExames.mockResolvedValue([{ id: 'ex-1', issuedAt: ISSUED_AT, items: [{}, {}, {}] }] as never)

      await renderWithProviders(<DocumentSection kind="exame" appointmentId="appt-1" canManage />)

      expect(await screen.findByTestId('document-item-ex-1')).toHaveTextContent(/3\ exames/)
    })

    it('um exame é singular', async () => {
      mockExames.mockResolvedValue([{ id: 'ex-1', issuedAt: ISSUED_AT, items: [{}] }] as never)

      await renderWithProviders(<DocumentSection kind="exame" appointmentId="appt-1" canManage />)

      expect(await screen.findByTestId('document-item-ex-1')).toHaveTextContent(/1\ exame/)
    })
  })

  it('cada tipo baixa do seu endereço', async () => {
    mockAtestados.mockResolvedValue([{ id: 'at-1', issuedAt: ISSUED_AT, daysOff: 1 }] as never)
    mockExames.mockResolvedValue([{ id: 'ex-1', issuedAt: ISSUED_AT, items: [{}] }] as never)

    await renderWithProviders(<DocumentSection kind="atestado" appointmentId="a" canManage />)
    fireEvent.press(await screen.findByTestId('document-download-at-1'))
    await waitFor(() =>
      expect(mockDownload).toHaveBeenCalledWith('/atestados/at-1/pdf', 'atestado-at-1.pdf'),
    )

    await renderWithProviders(<DocumentSection kind="exame" appointmentId="a" canManage />)
    fireEvent.press(await screen.findByTestId('document-download-ex-1'))
    await waitFor(() =>
      expect(mockDownload).toHaveBeenCalledWith('/exam-requests/ex-1/pdf', 'pedido-exame-ex-1.pdf'),
    )
  })

  it('cada tipo exclui pelo seu use-case', async () => {
    mockAtestados.mockResolvedValue([{ id: 'at-1', issuedAt: ISSUED_AT, daysOff: 1 }] as never)
    mockExames.mockResolvedValue([{ id: 'ex-1', issuedAt: ISSUED_AT, items: [{}] }] as never)
    mockDeleteAtestado.mockResolvedValue(undefined)
    mockDeleteExame.mockResolvedValue(undefined)

    await renderWithProviders(<DocumentSection kind="atestado" appointmentId="a" canManage />)
    fireEvent.press(await screen.findByTestId('document-delete-at-1'))
    await waitFor(() => expect(mockDeleteAtestado).toHaveBeenCalledWith('at-1'))

    await renderWithProviders(<DocumentSection kind="exame" appointmentId="a" canManage />)
    fireEvent.press(await screen.findByTestId('document-delete-ex-1'))
    await waitFor(() => expect(mockDeleteExame).toHaveBeenCalledWith('ex-1'))
  })

  // Só a linha que está baixando fica ocupada; as outras seguem tocáveis.
  it('marca como ocupada apenas a linha em download', async () => {
    mockPrescriptions.mockResolvedValue([
      { id: 'rx-1', issuedAt: ISSUED_AT, items: [{}] },
      { id: 'rx-2', issuedAt: ISSUED_AT, items: [{}] },
    ] as never)
    mockDownload.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<DocumentSection kind="receita" appointmentId="a" canManage />)
    fireEvent.press(await screen.findByTestId('document-download-rx-1'))

    await waitFor(() =>
      expect(screen.getByTestId('document-download-rx-1').props.accessibilityState.busy).toBe(true),
    )
    expect(screen.getByTestId('document-download-rx-2').props.accessibilityState.busy).toBe(false)
  })
})
