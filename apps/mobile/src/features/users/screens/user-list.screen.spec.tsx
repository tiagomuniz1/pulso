import { CouncilType, UserRole } from '@app/shared'
import { deleteUserUseCase, listUsersUseCase, type IUserModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { UserListScreen } from './user-list.screen'

jest.mock('@app/core/src/features/users/use-cases/list-users.use-case')
jest.mock('@app/core/src/features/users/use-cases/delete-user.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listUsersUseCase as jest.MockedFunction<typeof listUsersUseCase>
const mockDelete = deleteUserUseCase as jest.MockedFunction<typeof deleteUserUseCase>

const user = (overrides: Partial<IUserModel> = {}): IUserModel =>
  ({
    id: 'u-2',
    fullName: 'Mauro Lima',
    email: 'mauro@pulso.test',
    role: UserRole.PROFESSIONAL,
    isActive: true,
    isProfessional: true,
    isPatient: false,
    councilType: CouncilType.CRM,
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IUserModel

beforeEach(() => {
  jest.clearAllMocks()
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u-1', fullName: 'Dra. Ana', email: 'a@b.c', role: UserRole.ADMIN, clinicId: 'c1' } as never,
  })
  mockList.mockResolvedValue([user()])
  mockDelete.mockResolvedValue(undefined)
})

describe('UserListScreen', () => {
  it('mostra o usuário com situação, perfil e tipo', async () => {
    await renderWithProviders(<UserListScreen />)

    const card = await screen.findByTestId('user-card-u-2')
    expect(card).toHaveTextContent(/Mauro Lima/)
    expect(card).toHaveTextContent(/mauro@pulso\.test/)
    expect(card).toHaveTextContent(/Ativo/)
    expect(card).toHaveTextContent(/Profissional/)
    expect(card).toHaveTextContent(/Médico/)
  })

  it('conta no singular e no plural', async () => {
    await renderWithProviders(<UserListScreen />)
    expect(await screen.findByTestId('user-list-header-subtitle')).toHaveTextContent(
      /^1 usuário cadastrado$/,
    )
  })

  it('a conta desativada aparece como inativa', async () => {
    mockList.mockResolvedValue([user({ isActive: false })])

    await renderWithProviders(<UserListScreen />)

    expect(await screen.findByTestId('user-card-status-u-2')).toHaveTextContent(/^Inativo$/)
  })

  it.each([
    ['sem ficha nenhuma', { isProfessional: false, isPatient: false }, '—'],
    ['paciente', { isProfessional: false, isPatient: true }, 'Paciente'],
    ['profissional sem conselho', { isProfessional: true, councilType: null }, 'Profissional'],
  ])('tipo de %s', async (_caso, overrides, expected) => {
    mockList.mockResolvedValue([user(overrides)])

    await renderWithProviders(<UserListScreen />)

    expect(await screen.findByTestId('user-card-u-2')).toHaveTextContent(new RegExp(expected))
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<UserListScreen />)
    expect(screen.getByTestId('user-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<UserListScreen />)
    fireEvent.press(await screen.findByTestId('user-list-error-retry'))

    expect(await screen.findByTestId('user-card-u-2')).toBeTruthy()
  })

  it('diz quando não há usuário', async () => {
    mockList.mockResolvedValue([])
    await renderWithProviders(<UserListScreen />)
    expect(await screen.findByTestId('user-list-empty')).toHaveTextContent(
      /Nenhum usuário encontrado\.$/,
    )
  })

  it('busca no servidor depois que a digitação para', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<UserListScreen />)
      mockList.mockClear()

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('user-list-search'), 'mauro')
      })
      expect(mockList).not.toHaveBeenCalled()

      await act(async () => {
        jest.advanceTimersByTime(300)
      })
      expect(mockList).toHaveBeenCalledWith({ search: 'mauro' })
    } finally {
      jest.useRealTimers()
    }
  })

  it('a busca sem resultado diz que foi a busca', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<UserListScreen />)
      mockList.mockResolvedValue([])

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('user-list-search'), 'zzz')
        jest.advanceTimersByTime(300)
      })

      await waitFor(() =>
        expect(screen.getByTestId('user-list-empty')).toHaveTextContent(/para a busca realizada/),
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it('exclui pedindo confirmação e avisa depois', async () => {
    await renderWithProviders(<UserListScreen />)

    fireEvent.press(await screen.findByTestId('user-card-delete-u-2'))
    fireEvent.press(await screen.findByTestId('user-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('u-2'))
    expect(await screen.findByTestId('user-list-success')).toHaveTextContent(
      /Mauro Lima excluído com sucesso/,
    )
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<UserListScreen />)

    fireEvent.press(await screen.findByTestId('user-card-delete-u-2'))
    fireEvent.press(await screen.findByTestId('user-delete-dialog-cancel'))

    await waitFor(() => expect(screen.queryByTestId('user-delete-dialog-message')).toBeNull())
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<UserListScreen />)
    fireEvent.press(await screen.findByTestId('user-card-delete-u-2'))
    fireEvent.press(await screen.findByTestId('user-delete-dialog-confirm'))

    await waitFor(() => expect(screen.queryByTestId('user-delete-dialog-message')).toBeNull())
    expect(screen.queryByTestId('user-list-success')).toBeNull()
  })

  /**
   * Excluir a própria conta é perder o acesso na hora, sem volta — e numa
   * clínica com um administrador só, deixa a clínica sem ninguém capaz de
   * gerir usuários. O backend recusa; o botão fica apagado antes disso.
   */
  it('não dá para excluir a si mesmo', async () => {
    mockList.mockResolvedValue([user({ id: 'u-1', fullName: 'Dra. Ana' })])

    await renderWithProviders(<UserListScreen />)

    expect(await screen.findByTestId('user-card-delete-u-1')).toBeDisabled()
  })

  it.each([
    ['abre o detalhe', 'user-card-open-u-2', '/(app)/users/u-2'],
    ['abre a edição', 'user-card-edit-u-2', '/(app)/users/u-2/edit'],
    ['abre o cadastro', 'user-list-new', '/(app)/users/new'],
  ])('%s', async (_caso, testID, route) => {
    await renderWithProviders(<UserListScreen />)

    fireEvent.press(await screen.findByTestId(testID))

    expect(mockPush).toHaveBeenCalledWith(route)
  })
})
