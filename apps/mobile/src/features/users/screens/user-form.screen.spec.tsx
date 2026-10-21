import { CouncilType, UserRole } from '@app/shared'
import {
  createUserUseCase,
  getUserUseCase,
  listProfessionalsUseCase,
  updateUserUseCase,
  type IUserModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { EditUserScreen, NewUserScreen } from './user-form.screen'

jest.mock('@app/core/src/features/users/use-cases/create-user.use-case')
jest.mock('@app/core/src/features/users/use-cases/update-user.use-case')
jest.mock('@app/core/src/features/users/use-cases/get-user.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'u-2' }),
}))

const mockCreate = createUserUseCase as jest.MockedFunction<typeof createUserUseCase>
const mockUpdate = updateUserUseCase as jest.MockedFunction<typeof updateUserUseCase>
const mockGet = getUserUseCase as jest.MockedFunction<typeof getUserUseCase>

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
  mockCreate.mockResolvedValue(user())
  mockUpdate.mockResolvedValue(user())
  ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([])
})

async function preencher() {
  await act(async () => {
    screen.getByTestId('user-form-fullname').props.onChangeText('Mauro Lima')
    screen.getByTestId('user-form-email').props.onChangeText('mauro@pulso.test')
    screen.getByTestId('user-form-password').props.onChangeText('senha-forte-123')
  })
}

describe('NewUserScreen', () => {
  it('cria com perfil e senha', async () => {
    await renderWithProviders(<NewUserScreen />)
    await preencher()

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        fullName: 'Mauro Lima',
        email: 'mauro@pulso.test',
        password: 'senha-forte-123',
        role: UserRole.USER,
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('não envia sem os campos, e aponta onde', async () => {
    await renderWithProviders(<NewUserScreen />)

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByTestId('user-form-fullname-error')).toBeTruthy()
    expect(screen.getByTestId('user-form-email-error')).toBeTruthy()
    expect(screen.getByTestId('user-form-password-error')).toBeTruthy()
  })

  it('a descrição acompanha o perfil escolhido', async () => {
    await renderWithProviders(<NewUserScreen />)

    expect(screen.getByTestId('user-form-role-description')).toHaveTextContent(
      /Consulta pacientes, profissionais e consultas/,
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-role-admin'))
    })

    expect(screen.getByTestId('user-form-role-description')).toHaveTextContent(/Acesso total/)
  })

  // Criar não oferece "Profissional": virar profissional acontece ao criar a
  // ficha, não ao escolher um perfil aqui.
  it('criando, não há a opção Profissional', async () => {
    await renderWithProviders(<NewUserScreen />)

    expect(screen.queryByTestId('user-form-role-professional')).toBeNull()
  })

  it('mostra o conflito de e-mail sem sair da tela', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<NewUserScreen />)
    await preencher()
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    expect(await screen.findByTestId('user-form-error')).toHaveTextContent(/Já existe um usuário/)
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<NewUserScreen />)

    fireEvent.press(screen.getByTestId('user-new-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})

describe('EditUserScreen', () => {
  it('abre preenchido e salva sem pedir senha', async () => {
    await renderWithProviders(<EditUserScreen />)

    await screen.findByTestId('user-form')
    expect(screen.queryByTestId('user-form-password')).toBeNull()

    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('u-2', {
        fullName: 'Mauro Lima',
        email: 'mauro@pulso.test',
        isActive: true,
        role: UserRole.PROFESSIONAL,
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  // O valor atual precisa ser representável para a troca ter volta.
  it('editando um profissional, o perfil atual está na lista', async () => {
    await renderWithProviders(<EditUserScreen />)

    await screen.findByTestId('user-form')
    expect(screen.getByTestId('user-form-role-professional')).toBeTruthy()
  })

  it('desativa a conta', async () => {
    await renderWithProviders(<EditUserScreen />)

    await screen.findByTestId('user-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-active-active'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('u-2', expect.objectContaining({ isActive: false })),
    )
  })

  /**
   * Esta tela é o "Meu perfil" de quem não é ADMIN. Nem ele troca o próprio
   * perfil: numa clínica com um administrador só, rebaixar a si mesmo a
   * deixaria sem ninguém capaz de gerir usuários.
   */
  it.each([
    ['o profissional editando a si mesmo', UserRole.PROFESSIONAL, 'u-2'],
    ['o admin editando a si mesmo', UserRole.ADMIN, 'u-2'],
  ])('%s não escolhe perfil nem situação', async (_caso, role, id) => {
    asRole(role, id)

    await renderWithProviders(<EditUserScreen />)

    await screen.findByTestId('user-form')
    expect(screen.queryByTestId('user-form-role')).toBeNull()
    expect(screen.queryByTestId('user-form-active')).toBeNull()
  })

  it('sem poder trocar o perfil, ele não vai no corpo', async () => {
    asRole(UserRole.PROFESSIONAL, 'u-2')

    await renderWithProviders(<EditUserScreen />)
    await screen.findByTestId('user-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('role')
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<EditUserScreen />)
    expect(screen.getByTestId('user-edit-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<EditUserScreen />)
    fireEvent.press(await screen.findByTestId('user-edit-error-retry'))

    expect(await screen.findByTestId('user-form')).toBeTruthy()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<EditUserScreen />)
    await screen.findByTestId('user-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('user-form-submit'))
    })

    expect(await screen.findByTestId('user-form-error')).toHaveTextContent(
      /Não foi possível salvar/,
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<EditUserScreen />)

    fireEvent.press(screen.getByTestId('user-edit-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})
