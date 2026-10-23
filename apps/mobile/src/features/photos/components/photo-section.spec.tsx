import * as ImagePicker from 'expo-image-picker'
import {
  deleteConsultationPhotoUseCase,
  listAppointmentPhotosUseCase,
  uploadConsultationPhotosUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { PhotoSection } from './photo-section'

jest.mock('@app/core/src/features/consultation-photos/use-cases/list-appointment-photos.use-case')
jest.mock('@app/core/src/features/consultation-photos/use-cases/upload-consultation-photos.use-case')
jest.mock('@app/core/src/features/consultation-photos/use-cases/delete-consultation-photo.use-case')

const mockList = listAppointmentPhotosUseCase as jest.MockedFunction<typeof listAppointmentPhotosUseCase>
const mockUpload = uploadConsultationPhotosUseCase as jest.MockedFunction<typeof uploadConsultationPhotosUseCase>
const mockDelete = deleteConsultationPhotoUseCase as jest.MockedFunction<typeof deleteConsultationPhotoUseCase>

const photo = {
  id: 'ph-1',
  appointmentId: 'appt-1',
  fileName: 'ferida.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 204800,
  createdAt: new Date(2026, 3, 12),
} as never

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue([])
  ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
  ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
})

function render(canIssue = true) {
  return renderWithProviders(<PhotoSection appointmentId="appt-1" canIssue={canIssue} />)
}

describe('PhotoSection', () => {
  it('diz quando não há foto', async () => {
    await render()

    expect(await screen.findByTestId('photo-empty')).toBeTruthy()
  })

  it('lista as fotos com tamanho e data', async () => {
    mockList.mockResolvedValue([photo])

    await render()

    const item = await screen.findByTestId('photo-item-ph-1')
    expect(item).toHaveTextContent(/ferida\.jpg/)
    expect(item).toHaveTextContent(/200 KB/)
  })

  it('oferece tentar de novo quando falha, e tenta', async () => {
    mockList.mockRejectedValue(new Error('rede'))

    await render()
    await screen.findByTestId('photo-error')
    mockList.mockResolvedValue([photo])

    fireEvent.press(screen.getByTestId('photo-error-retry'))

    expect(await screen.findByTestId('photo-item-ph-1')).toBeTruthy()
  })

  // Negar a galeria é outro pedido de permissão que o da câmera: o sistema
  // trata os dois separadamente, e negar um não nega o outro.
  it('avisa quando a permissão da galeria é negada', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    })

    await render()
    fireEvent.press(await screen.findByTestId('photo-library'))

    expect(await screen.findByTestId('photo-permission-denied')).toBeTruthy()
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('desistir da galeria não envia nada', async () => {
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null,
    })

    await render()
    fireEvent.press(await screen.findByTestId('photo-library'))

    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled())
    expect(mockUpload).not.toHaveBeenCalled()
  })

  /**
   * Na web o botão abre um seletor de arquivo. Aqui abre a câmera — é o
   * motivo de o app existir.
   */
  it('tira foto e envia', async () => {
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg' }],
    })
    mockUpload.mockResolvedValue([photo])

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith('appt-1', [
        { uri: 'file:///foto.jpg', name: 'foto.jpg', type: 'image/jpeg' },
      ]),
    )
  })

  // A foto nem sempre é tirada na hora: a paciente manda por mensagem e o
  // profissional anexa.
  it('envia várias da galeria', async () => {
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' },
        { uri: 'file:///b.png', fileName: 'b.png', mimeType: 'image/png' },
      ],
    })
    mockUpload.mockResolvedValue([photo])

    await render()
    fireEvent.press(await screen.findByTestId('photo-library'))

    await waitFor(() => expect(mockUpload).toHaveBeenCalled())
    expect(mockUpload.mock.calls[0]?.[1]).toHaveLength(2)
  })

  // Vindo da câmera o seletor quase nunca devolve nome.
  it('inventa um nome quando o seletor não dá', async () => {
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///sem-nome', fileName: null, mimeType: null }],
    })
    mockUpload.mockResolvedValue([photo])

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    await waitFor(() => expect(mockUpload).toHaveBeenCalled())
    const sent = mockUpload.mock.calls[0]?.[1][0] as { name: string; type: string }
    expect(sent.name).toMatch(/^foto-\d+-0\.jpg$/)
    expect(sent.type).toBe('image/jpeg')
  })

  it('desistir não envia nada e não avisa nada', async () => {
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null })

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled())
    expect(mockUpload).not.toHaveBeenCalled()
    expect(screen.queryByTestId('photo-permission-denied')).toBeNull()
  })

  // Permissão negada é outra coisa: a pessoa precisa saber onde liberar.
  it('avisa quando a permissão é negada', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    expect(await screen.findByTestId('photo-permission-denied')).toBeTruthy()
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled()
  })

  it('avisa quando o envio falha', async () => {
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' }],
    })
    mockUpload.mockRejectedValue({ status: 413, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    expect(await screen.findByTestId('photo-upload-error')).toBeTruthy()
  })

  it('exclui uma foto', async () => {
    mockList.mockResolvedValue([photo])
    mockDelete.mockResolvedValue(undefined)

    await render()
    fireEvent.press(await screen.findByTestId('photo-delete-ph-1'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('ph-1'))
  })

  it('avisa quando excluir falha', async () => {
    mockList.mockResolvedValue([photo])
    mockDelete.mockRejectedValue({ status: 403, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('photo-delete-ph-1'))

    expect(await screen.findByTestId('photo-delete-error')).toBeTruthy()
  })

  // Enviar foto é exercício: depende da ficha e da própria consulta.
  it('quem não emite nem envia nem exclui', async () => {
    mockList.mockResolvedValue([photo])

    await render(false)
    await screen.findByTestId('photo-item-ph-1')

    expect(screen.queryByTestId('photo-camera')).toBeNull()
    expect(screen.queryByTestId('photo-library')).toBeNull()
    expect(screen.queryByTestId('photo-delete-ph-1')).toBeNull()
  })

  it('mostra o giro enquanto envia', async () => {
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' }],
    })
    mockUpload.mockReturnValue(new Promise(() => {}))

    await render()
    fireEvent.press(await screen.findByTestId('photo-camera'))

    expect(await screen.findByTestId('photo-uploading')).toBeTruthy()
  })

  it('mostra o giro enquanto carrega a lista', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('photo-loading')).toBeTruthy()
  })
})
