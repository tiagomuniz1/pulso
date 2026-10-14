import { UserRole } from '@app/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { useSessionStore } from '../auth/session.store'
import { useThemeStore } from '../../theme/theme.store'
import { logout } from '../auth/auth.service'
import { AppHeader } from './app-header'
import { useNavigationStore } from './navigation.store'

jest.mock('../auth/auth.service', () => ({ logout: jest.fn(async () => undefined) }))

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

  it('sai da conta ao tocar no avatar', async () => {
    await renderWithProviders(<AppHeader />)

    fireEvent.press(screen.getByTestId('header-user'))

    await waitFor(() => expect(mockLogout).toHaveBeenCalled())
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'))
  })

  it('sobrevive a não haver usuário', async () => {
    useSessionStore.setState({ status: 'loading', user: null })

    await renderWithProviders(<AppHeader />)

    expect(screen.getByTestId('header-user')).toBeTruthy()
  })
})
