import { listPatientPhotosUseCase } from '@app/core'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { PatientPhotoGallery } from './patient-photo-gallery'

jest.mock('@app/core/src/features/consultation-photos/use-cases/list-patient-photos.use-case')

const mockList = listPatientPhotosUseCase as jest.MockedFunction<typeof listPatientPhotosUseCase>

const photo = (overrides = {}) =>
  ({
    id: 'photo-1',
    fileName: 'evolucao-01.jpg',
    fileSizeBytes: 204_800,
    createdAt: new Date(2026, 9, 20),
    ...overrides,
  }) as never

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue({ data: [photo()], total: 1, page: 1, limit: 50 } as never)
})

describe('PatientPhotoGallery', () => {
  it('lista a foto com nome e data', async () => {
    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)

    const item = await screen.findByTestId('patient-photo-photo-1')
    expect(item).toHaveTextContent(/evolucao-01\.jpg/)
    expect(item).toHaveTextContent(/20\/10\/2026/)
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)

    expect(screen.getByTestId('patient-photos-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)
    fireEvent.press(await screen.findByTestId('patient-photos-error-retry'))

    expect(await screen.findByTestId('patient-photo-photo-1')).toBeTruthy()
  })

  it('diz quando não há foto', async () => {
    mockList.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 } as never)

    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)

    expect(await screen.findByTestId('patient-photos-empty')).toHaveTextContent(
      /Nenhuma foto registrada/,
    )
  })

  /**
   * A galeria do paciente é só leitura: enviar e excluir são atos de
   * atendimento e pertencem à consulta de onde a foto veio. É também o que
   * impede alguém de apagar daqui a foto de uma consulta alheia.
   */
  it('não oferece enviar nem excluir', async () => {
    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)

    await screen.findByTestId('patient-photo-photo-1')
    expect(screen.queryByTestId('photo-camera')).toBeNull()
    expect(screen.queryByTestId('photo-delete-photo-1')).toBeNull()
  })

  // Uma página grande de propósito: a ficha mostra a evolução, e paginar de
  // dez em dez esconderia o começo do tratamento.
  it('pede uma página grande', async () => {
    await renderWithProviders(<PatientPhotoGallery patientId="pat-1" />)

    await screen.findByTestId('patient-photo-photo-1')
    expect(mockList).toHaveBeenCalledWith('pat-1', 1, 50)
  })
})
