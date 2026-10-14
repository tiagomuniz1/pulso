jest.mock('@app/core/src/features/vaccine-indications/services/vaccine-indications.service')

import { vaccineIndicationsService } from '@app/core'
import { downloadVaccineIndicationPdfUseCase } from './download-vaccine-indication-pdf.use-case'

const mockService = vaccineIndicationsService as jest.Mocked<typeof vaccineIndicationsService>

// Este use-case ficou na web porque entrega o arquivo pelo DOM
// (`createObjectURL` + `<a download>`). O core busca os bytes; quem os salva
// é cada app — no celular, `expo-file-system` mais `expo-sharing`.
describe('downloadVaccineIndicationPdfUseCase', () => {
  const mockObjectUrl = 'blob:mock-url'
  const mockCreateObjectURL = jest.fn(() => mockObjectUrl)
  const mockRevokeObjectURL = jest.fn()
  const mockClick = jest.fn()
  let anchorElement: HTMLAnchorElement

  beforeAll(() => {
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
      writable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    anchorElement = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement
    jest.spyOn(document, 'createElement').mockReturnValue(anchorElement)
  })

  afterEach(() => jest.restoreAllMocks())

  it('baixa com nome padrão e libera a URL do blob', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadVaccineIndicationPdfUseCase('indication-uuid')

    expect(anchorElement.download).toBe('indicacao-vacina-indication-uuid.pdf')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
  })

  it('respeita o nome de arquivo informado', async () => {
    mockService.downloadPdf.mockResolvedValue(new Blob(['%PDF']))
    await downloadVaccineIndicationPdfUseCase('indication-uuid', 'custom.pdf')
    expect(anchorElement.download).toBe('custom.pdf')
  })
})
