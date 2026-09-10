import { DataSource } from 'typeorm'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp')
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { LoadClinicLogoUseCase } from '../use-cases/load-clinic-logo.use-case'

const clinicId = 'clinic-uuid'

const mockClinicsRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<IClinicsRepository>

const mockStorageAdapter = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
} as unknown as jest.Mocked<IStorageAdapter>

/** Um PNG 1x1 de verdade — o `sharp` precisa conseguir lê-lo. */
async function pngDeVerdade(): Promise<Buffer> {
  return sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
}

describe('LoadClinicLogoUseCase', () => {
  let useCase: LoadClinicLogoUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LoadClinicLogoUseCase(
      {} as DataSource,
      mockClinicsRepository,
      mockStorageAdapter,
    )
  })

  it('returns a data URI read straight from storage', async () => {
    const png = await pngDeVerdade()
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.png' } as never)
    mockStorageAdapter.download.mockResolvedValue(png)

    const result = await useCase.execute(clinicId)

    expect(mockStorageAdapter.download).toHaveBeenCalledWith('clinics/x/logo.png')
    expect(result).toBe(`data:image/png;base64,${png.toString('base64')}`)
  })

  // É o ponto da mudança: nada de sair pela internet para ler um arquivo que
  // está do lado. O uso de HTTP aqui derrubava o logo em produção.
  it('does not reach the network', async () => {
    const png = await pngDeVerdade()
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.png' } as never)
    mockStorageAdapter.download.mockResolvedValue(png)
    const fetchSpy = jest.spyOn(globalThis, 'fetch' as never)

    await useCase.execute(clinicId)

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('serves a JPEG logo under its own content type', async () => {
    const jpeg = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 1, g: 1, b: 1 } },
    })
      .jpeg()
      .toBuffer()
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.jpg' } as never)
    mockStorageAdapter.download.mockResolvedValue(jpeg)

    const result = await useCase.execute(clinicId)

    expect(result!.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  // O pdfmake não lê WebP.
  it('converts a WebP logo to PNG', async () => {
    const webp = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 2, g: 2, b: 2 } },
    })
      .webp()
      .toBuffer()
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.webp' } as never)
    mockStorageAdapter.download.mockResolvedValue(webp)

    const result = await useCase.execute(clinicId)

    expect(result!.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('returns null when the clinic has no logo', async () => {
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: null } as never)

    await expect(useCase.execute(clinicId)).resolves.toBeNull()
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('returns null when the clinic does not exist', async () => {
    mockClinicsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(clinicId)).resolves.toBeNull()
  })

  it('returns null for a format the PDF cannot embed', async () => {
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.svg' } as never)

    await expect(useCase.execute(clinicId)).resolves.toBeNull()
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  // O upload só valida o `mimetype` que o cliente manda, então um arquivo que
  // apenas se diz PNG chega intacto até aqui — e o pdfmake responde a uma
  // imagem corrompida com exceção, derrubando o documento inteiro.
  it('returns null when the bytes are not a real image, even with a .png name', async () => {
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.png' } as never)
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('fake-png-bytes'))

    await expect(useCase.execute(clinicId)).resolves.toBeNull()
  })

  it('returns null when storage fails', async () => {
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.png' } as never)
    mockStorageAdapter.download.mockRejectedValue(new Error('NoSuchKey'))

    await expect(useCase.execute(clinicId)).resolves.toBeNull()
  })

  // Um `catch` que descartava o erro foi o que tornou a falha de produção
  // impossível de diagnosticar: o log dizia que não conseguiu, nunca por quê.
  it('logs why it gave up', async () => {
    const warn = jest.spyOn(useCase['logger'], 'warn').mockImplementation()
    mockClinicsRepository.findById.mockResolvedValue({ logoPath: 'clinics/x/logo.png' } as never)
    mockStorageAdapter.download.mockRejectedValue(new Error('NoSuchKey'))

    await useCase.execute(clinicId)

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not read the clinic logo'),
      expect.objectContaining({ reason: 'NoSuchKey', clinicId }),
    )
  })
})
