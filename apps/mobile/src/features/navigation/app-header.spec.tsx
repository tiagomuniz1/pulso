import { UserRole } from '@app/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { useSessionStore } from '../auth/session.store'
import { useThemeStore } from '../../theme/theme.store'
import { logout } from '../auth/auth.service'
import { AppHeader } from './app-header'
import { useNavigationStore } from './navigation.store'

jest.mock('../auth/auth.service', () => ({ logout: jest.fn(async () => undefined) }))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockLogout = logout as jest.MockedFunction<typeof logout>

function signIn(fullName = 'Ana Paula Souza') {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'u1',
      fullName,
      email: 'ana@pulso.test',
      role: UserRole.ADMIN,
      clinicId: 'c1',
    },
  })
}

describe('AppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    signIn()
    useThemeStore.setState({ mode: 'light' })
    useNavigationStore.setState({ isDrawerOpen: false })
  })

  it('abre o menu pelo hamburger', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-menu'))

    expect(useNavigationStore.getState().isDrawerOpen).toBe(true)
  })

  it('alterna o tema', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-theme-toggle'))

    expect(useThemeStore.getState().mode).toBe('dark')
  })

  // O rótulo diz para onde vai, não onde está.
  it.each([
    ['light', 'Alternar para modo escuro'],
    ['dark', 'Alternar para modo claro'],
  ] as const)('no tema %s o botão anuncia %s', async (mode, label) => {
    useThemeStore.setState({ mode })

    await renderWithProviders(<AppHeader />)

    expect(screen.getByLabelText(label)).toBeTruthy()
  })

  it('mostra as iniciais de quem está logado', async () => {
    await renderWithProviders(<AppHeader />)

    expect(screen.getByTestId('header-user')).toHaveTextContent('AS')
  })

  /**
   * O avatar abre o menu, não sai da conta.
   *
   * Saía direto enquanto não havia tela de perfil. Agora há, e um toque
   * acidental no próprio nome que derrubasse a sessão seria o pior caminho
   * possível — ainda mais numa tela usada de pé, com uma mão só.
   */
  it('o avatar abre o menu da conta', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-user'))

    expect(await screen.findByTestId('header-user-menu')).toHaveTextContent(/Ana Paula Souza/)
    expect(screen.getByTestId('header-user-menu')).toHaveTextContent(/ana@pulso\.test/)
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('sai da conta pelo menu', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-user'))
    fireEvent.press(await screen.findByTestId('header-logout'))

    await waitFor(() => expect(mockLogout).toHaveBeenCalled())
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'))
  })

  // É por aqui que PROFESSIONAL e recepção chegam ao próprio cadastro: a
  // listagem de usuários não lhes é oferecida.
  it('abre o próprio perfil pelo menu', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-user'))
    fireEvent.press(await screen.findByTestId('header-profile'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/users/u1/edit')
  })

  it('o fundo fecha o menu', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-user'))
    fireEvent.press(await screen.findByTestId('header-user-menu-backdrop'))

    await waitFor(() => expect(screen.queryByTestId('header-user-menu')).toBeNull())
  })

  it('sobrevive a não haver usuário', async () => {
    useSessionStore.setState({ status: 'loading', user: null })

    await renderWithProviders(<AppHeader />)

    expect(screen.getByTestId('header-user')).toBeTruthy()
  })

  // Sem sessão não há para onde ir, e o menu não deve navegar para
  // `/users/undefined/edit`.
  it('sem usuário, o perfil não navega', async () => {
    useSessionStore.setState({ status: 'loading', user: null })

    await renderWithProviders(<AppHeader />)
    fireEvent.press(screen.getByTestId('header-user'))
    fireEvent.press(await screen.findByTestId('header-profile'))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
