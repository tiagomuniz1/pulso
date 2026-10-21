import * as DocumentPicker from 'expo-document-picker'
import { addExamResultUseCase, deleteExamResultUseCase, type IExamResultModel } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { downloadAndShareDocument } from '../../../lib/document-download'
import { ExamResults } from './exam-results'

jest.mock('@app/core/src/features/exames/use-cases/add-exam-result.use-case')
jest.mock('@app/core/src/features/exames/use-cases/delete-exam-result.use-case')
jest.mock('../../../lib/document-download')

const mockAdd = addExamResultUseCase as jest.MockedFunction<typeof addExamResultUseCase>
const mockDelete = deleteExamResultUseCase as jest.MockedFunction<typeof deleteExamResultUseCase>
const mockDownload = downloadAndShareDocument as jest.MockedFunction<typeof downloadAndShareDocument>
const mockPick = DocumentPicker.getDocumentAsync as jest.Mock

const result = (overrides = {}): IExamResultModel => ({
  id: 'res-1',
  fileName: 'hemograma.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1_572_864,
  createdAt: new Date(2026, 3, 12),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockAdd.mockResolvedValue({ id: 'ex-1' } as never)
  mockDelete.mockResolvedValue(undefined)
  mockDownload.mockResolvedValue(undefined)
  mockPick.mockResolvedValue({ canceled: true, assets: null })
})

function render({ results = [] as IExamResultModel[], canIssue = true } = {}) {
  return renderWithProviders(
    <ExamResults
      examRequestId="ex-1"
      appointmentId="appt-1"
      results={results}
      canIssue={canIssue}
    />,
  )
}

describe('ExamResults', () => {
  it('diz quando não há anexo', async () => {
    await render()

    expect(screen.getByTestId('exam-results-empty-ex-1')).toBeTruthy()
  })

  it('lista o anexo com nome, tamanho e data', async () => {
    await render({ results: [result()] })

    const item = screen.getByTestId('exam-result-res-1')
    expect(item).toHaveTextContent(/hemograma\.pdf/)
    expect(item).toHaveTextContent(/1,5 MB · 12\/04\/2026/)
  })

  // Abaixo de 1 MB a casa decimal vira ruído: "0,1 MB" diz menos que "102 KB".
  it('arquivo pequeno aparece em KB', async () => {
    await render({ results: [result({ fileSizeBytes: 104_857 })] })

    expect(screen.getByTestId('exam-result-res-1')).toHaveTextContent(/102 KB/)
  })

  /**
   * O nome vem do registro, e o tipo também: o anexo pode ser imagem, e
   * entregar uma foto ao sistema anunciando `application/pdf` faria o
   * aparelho oferecer o aplicativo errado para abri-la.
   */
  it('baixa o anexo com o nome e o tipo que ele tem', async () => {
    await render({ results: [result({ mimeType: 'image/jpeg', fileName: 'laudo.jpg' })] })

    fireEvent.press(screen.getByTestId('exam-result-download-res-1'))

    await waitFor(() =>
      expect(mockDownload).toHaveBeenCalledWith(
        '/exam-results/res-1/file',
        'laudo.jpg',
        'image/jpeg',
      ),
    )
  })

  it('anexa os arquivos escolhidos', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 1000 },
        { uri: 'file:///b.jpg', name: 'b.jpg', mimeType: 'image/jpeg', size: 2000 },
      ],
    })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith('ex-1', [
        { uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' },
        { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' },
      ]),
    )
  })

  // O provedor de arquivos nem sempre devolve nome ou tipo.
  it('inventa nome e tipo quando o seletor não dá', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///sem-nome', name: '', mimeType: null, size: 10 }],
    })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    const sent = mockAdd.mock.calls[0][1][0] as { name: string; type: string }
    expect(sent.name).toMatch(/^resultado-\d+-0\.pdf$/)
    expect(sent.type).toBe('application/pdf')
  })

  // O provedor de arquivos pode não informar o tamanho; sem isso a
  // validação de 10 MB barraria tudo, ou nada.
  it('arquivo sem tamanho informado passa pela validação', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: undefined }],
    })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    await waitFor(() => expect(mockAdd).toHaveBeenCalled())
    expect(screen.queryByTestId('exam-result-validation-error-ex-1')).toBeNull()
  })

  it('desistir não anexa nada e não avisa nada', async () => {
    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    await waitFor(() => expect(mockPick).toHaveBeenCalled())
    expect(mockAdd).not.toHaveBeenCalled()
    expect(screen.queryByTestId('exam-result-validation-error-ex-1')).toBeNull()
  })

  /**
   * As duas validações são as mesmas da web, e existem aqui para poupar o
   * upload: o backend recusaria depois, e 10 MB por uma rede de celular é
   * caro para descobrir isso no fim.
   */
  it.each([
    [
      'tipo recusado',
      [{ uri: 'file:///a.docx', name: 'a.docx', mimeType: 'application/msword', size: 10 }],
      /Tipo inválido/,
    ],
    [
      'arquivo grande demais',
      [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 11 * 1024 * 1024 }],
      /limite é 10MB/,
    ],
  ])('recusa %s antes de enviar', async (_caso, assets, message) => {
    mockPick.mockResolvedValue({ canceled: false, assets })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    expect(await screen.findByTestId('exam-result-validation-error-ex-1')).toHaveTextContent(message)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('remove um anexo', async () => {
    await render({ results: [result()] })

    fireEvent.press(screen.getByTestId('exam-result-remove-res-1'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('res-1'))
  })

  /**
   * Anexar e remover são exercício, como emitir o próprio pedido: quem não
   * assinou aquele pedido não mexe no resultado dele. Baixar é leitura, e
   * continua.
   */
  it('quem não emite lê o anexo, mas não mexe', async () => {
    await render({ results: [result()], canIssue: false })

    expect(screen.getByTestId('exam-result-download-res-1')).toBeTruthy()
    expect(screen.queryByTestId('exam-result-remove-res-1')).toBeNull()
    expect(screen.queryByTestId('exam-result-attach-ex-1')).toBeNull()
  })

  it('explica o 403 ao anexar', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 10 }],
    })
    mockAdd.mockRejectedValue({ status: 403, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    expect(await screen.findByTestId('exam-result-upload-error-ex-1')).toHaveTextContent(
      /não tem permissão/,
    )
  })

  it('avisa genericamente nos outros erros ao anexar', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 10 }],
    })
    mockAdd.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    expect(await screen.findByTestId('exam-result-upload-error-ex-1')).toHaveTextContent(
      /Ocorreu um erro ao anexar/,
    )
  })

  it('avisa quando remover falha', async () => {
    mockDelete.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await render({ results: [result()] })
    fireEvent.press(screen.getByTestId('exam-result-remove-res-1'))

    expect(await screen.findByTestId('exam-result-remove-error-ex-1')).toBeTruthy()
  })

  it('avisa quando baixar falha', async () => {
    mockDownload.mockRejectedValue(new Error('sem espaço'))

    await render({ results: [result()] })
    fireEvent.press(screen.getByTestId('exam-result-download-res-1'))

    expect(await screen.findByTestId('exam-result-download-error-ex-1')).toBeTruthy()
  })

  it('apaga o botão enquanto envia', async () => {
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.pdf', name: 'a.pdf', mimeType: 'application/pdf', size: 10 }],
    })
    mockAdd.mockReturnValue(new Promise(() => {}))

    await render()
    fireEvent.press(screen.getByTestId('exam-result-attach-ex-1'))

    await waitFor(() => expect(screen.getByTestId('exam-result-attach-ex-1')).toBeDisabled())
  })
})
