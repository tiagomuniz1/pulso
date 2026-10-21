import { CouncilType, UserRole } from '@app/shared'
import {
  deleteUserUseCase,
  getUserUseCase,
  listProfessionalsUseCase,
  sendSetPasswordEmailUseCase,
  type IUserModel,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { UserDetailScreen } from './user-detail.screen'

jest.mock('@app/core/src/features/users/use-cases/get-user.use-case')
jest.mock('@app/core/src/features/users/use-cases/delete-user.use-case')
jest.mock('@app/core/src/features/users/use-cases/send-set-password-email.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'u-2' }),
}))

const mockGet = getUserUseCase as jest.MockedFunction<typeof getUserUseCase>
const mockDelete = deleteUserUseCase as jest.MockedFunction<typeof deleteUserUseCase>
const mockSend = sendSetPasswordEmailUseCase as jest.MockedFunction<
  typeof sendSetPasswordEmailUseCase
>
const mockProfessionals = listProfessionalsUseCase as jest.MockedFunction<
  typeof listProfessionalsUseCase
>

const user = (overrides: Partial<IUserModel> = {}): IUserModel =>
  ({
    id: 'u-2',
    fullName: 'Mauro Lima',
    email: 'mauro@pulso.test',
    role: UserRole.PROFESSIONAL,
    isActive: true,
    isProfessional: false,
    isPatient: false,
    councilType: CouncilType.CRM,
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IUserModel

function asRole(role: UserRole, id = 'u-1') {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id, fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockGet.mockResolvedValue(user())
  mockDelete.mockResolvedValue(undefined)
  mockSend.mockResolvedValue(undefined)
  mockProfessionals.mockResolvedValue([])
})

describe('UserDetailScreen', () => {
  it('mostra nome, e-mail, situação e perfil com a descrição', async () => {
    await renderWithProviders(<UserDetailScreen />)

    expect(await screen.findByTestId('user-details-name')).toHaveTextContent(/Mauro Lima/)
    expect(screen.getByTestId('user-details-email')).toHaveTextContent(/mauro@pulso\.test/)
    expect(screen.getByTestId('user-details-status')).toHaveTextContent(/^Ativo$/)
    expect(screen.getByTestId('user-details-role')).toHaveTextContent(/^Profissional$/)
    expect(screen.getByTestId('user-details')).toHaveTextContent(/Gerencia a própria agenda/)
  })

  it('a conta desativada aparece como inativa', async () => {
    mockGet.mockResolvedValue(user({ isActive: false }))

    await renderWithProviders(<UserDetailScreen />)

    expect(await screen.findByTestId('user-details-status')).toHaveTextContent(/^Inativo$/)
  })

  /**
   * `isProfessional` diz se o usuário **tem ficha**; o cargo só diz o que
   * ele administra. Um ADMIN que também atende tem CRM para mostrar, e o
   * cargo esconderia.
   */
  it('mostra a profissão de quem tem ficha', async () => {
    mockGet.mockResolvedValue(user({ isProfessional: true }))
    mockProfessionals.mockResolvedValue([
      {
        id: 'prof-1',
        user: { id: 'u-2', fullName: 'Mauro Lima' },
        registrations: [
          { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
        ],
      },
    ] as never)

    await renderWithProviders(<UserDetailScreen />)

    expect(await screen.findByTestId('user-details-profession')).toHaveTextContent(
      /Medicina \(CRM 12345\/SP\)/,
    )
  })

  it('quem não tem ficha não paga a busca de profissionais', async () => {
    await renderWithProviders(<UserDetailScreen />)

    await screen.findByTestId('user-details-name')
    expect(mockProfessionals).not.toHaveBeenCalled()
    expect(screen.queryByTestId('user-details-profession')).toBeNull()
  })

  it('envia o link de senha e confirma', async () => {
    await renderWithProviders(<UserDetailScreen />)

    fireEvent.press(await screen.findByTestId('user-details-send-set-password'))

    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('u-2'))
    expect(await screen.findByTestId('user-details-send-set-password-success')).toHaveTextContent(
      /enviado para mauro@pulso\.test/,
    )
  })

  /**
   * O backend responde `503` quando o e-mail não sai — de propósito, para a
   * tela não confirmar uma entrega que não aconteceu. A mensagem é
   * traduzida por status; o `detail` técnico nunca aparece.
   */
  it.each([
    [503, /envio pode não estar configurado/],
    [422, /Ative o usuário antes/],
    [500, /Ocorreu um erro ao enviar/],
  ])('explica o erro %s ao enviar o link', async (status, expected) => {
    mockSend.mockRejectedValue({ status, title: 'x', detail: 'detalhe técnico' })

    await renderWithProviders(<UserDetailScreen />)
    fireEvent.press(await screen.findByTestId('user-details-send-set-password'))

    const error = await screen.findByTestId('user-details-send-set-password-error')
    expect(error).toHaveTextContent(expected)
    expect(error).not.toHaveTextContent(/detalhe técnico/)
  })

  // Conta desativada não entra no sistema, e o link morreria no login sem
  // explicação. O backend responde `422`; o botão fica apagado antes.
  it('conta inativa não recebe link', async () => {
    mockGet.mockResolvedValue(user({ isActive: false }))

    await renderWithProviders(<UserDetailScreen />)

    expect(await screen.findByTestId('user-details-send-set-password')).toBeDisabled()
  })

  // PATIENT não faz login, então o link não tem para onde levar.
  it('paciente não tem botão de link', async () => {
    mockGet.mockResolvedValue(user({ role: UserRole.PATIENT }))

    await renderWithProviders(<UserDetailScreen />)

    await screen.findByTestId('user-details-name')
    expect(screen.queryByTestId('user-details-send-set-password')).toBeNull()
  })

  it('exclui e volta', async () => {
    await renderWithProviders(<UserDetailScreen />)

    fireEvent.press(await screen.findByTestId('user-details-delete'))
    fireEvent.press(await screen.findByTestId('user-detail-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('u-2'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<UserDetailScreen />)
    fireEvent.press(await screen.findByTestId('user-details-delete'))
    fireEvent.press(await screen.findByTestId('user-detail-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('user-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<UserDetailScreen />)

    fireEvent.press(await screen.findByTestId('user-details-delete'))
    fireEvent.press(await screen.findByTestId('user-detail-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('user-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('não oferece excluir a si mesmo', async () => {
    asRole(UserRole.ADMIN, 'u-2')

    await renderWithProviders(<UserDetailScreen />)

    await screen.findByTestId('user-details-name')
    expect(screen.queryByTestId('user-details-delete')).toBeNull()
    expect(screen.getByTestId('user-details-edit')).toBeTruthy()
  })

  /**
   * PROFESSIONAL e recepção chegam a esta tela como "Meu perfil". Nenhuma
   * das ações administrativas lhes é oferecida — o backend as recusaria.
   */
  it('quem não é ADMIN não vê ação nenhuma', async () => {
    asRole(UserRole.PROFESSIONAL, 'u-2')

    await renderWithProviders(<UserDetailScreen />)

    await screen.findByTestId('user-details-name')
    expect(screen.queryByTestId('user-details-edit')).toBeNull()
    expect(screen.queryByTestId('user-details-delete')).toBeNull()
    expect(screen.queryByTestId('user-details-send-set-password')).toBeNull()
  })

  it('abre a edição e volta', async () => {
    await renderWithProviders(<UserDetailScreen />)

    fireEvent.press(await screen.findByTestId('user-details-edit'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/users/u-2/edit')
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<UserDetailScreen />)

    fireEvent.press(await screen.findByTestId('user-detail-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<UserDetailScreen />)
    expect(screen.getByTestId('user-detail-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<UserDetailScreen />)
    fireEvent.press(await screen.findByTestId('user-detail-error-retry'))

    expect(await screen.findByTestId('user-details-name')).toBeTruthy()
  })
})
