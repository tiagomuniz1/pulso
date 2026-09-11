import { downloadBlob } from './download-blob'

const mockObjectUrl = 'blob:mock-url'
const mockCreateObjectURL = jest.fn(() => mockObjectUrl)
const mockRevokeObjectURL = jest.fn()
const mockClick = jest.fn()

beforeAll(() => {
  Object.defineProperty(globalThis, 'URL', {
    value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
    writable: true,
  })
})

describe('downloadBlob', () => {
  let anchorElement: HTMLAnchorElement

  beforeEach(() => {
    jest.clearAllMocks()
    anchorElement = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    jest.spyOn(document, 'createElement').mockReturnValue(anchorElement)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('hands the blob to the browser under the given file name', () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })

    downloadBlob(blob, 'prontuario-abc.pdf')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(anchorElement.href).toBe(mockObjectUrl)
    expect(anchorElement.download).toBe('prontuario-abc.pdf')
    expect(mockClick).toHaveBeenCalled()
  })

  // Revogar antes do clique cancelaria o download; nunca revogar vazaria a URL
  // enquanto a aba estiver aberta.
  it('revokes the object URL after the click, never before', () => {
    downloadBlob(new Blob(['%PDF']), 'arquivo.pdf')

    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
    expect(mockCreateObjectURL.mock.invocationCallOrder[0]).toBeLessThan(
      mockClick.mock.invocationCallOrder[0],
    )
    expect(mockClick.mock.invocationCallOrder[0]).toBeLessThan(
      mockRevokeObjectURL.mock.invocationCallOrder[0],
    )
  })

  // A âncora nunca entra no DOM: `click()` funciona num elemento solto e não
  // deixa resíduo se algo lançar no meio.
  it('does not attach the anchor to the document', () => {
    const appendChild = jest.spyOn(document.body, 'appendChild')

    downloadBlob(new Blob(['%PDF']), 'arquivo.pdf')

    expect(appendChild).not.toHaveBeenCalled()
  })
})
