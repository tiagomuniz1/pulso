import { UserRole } from '@app/shared'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { useSessionStore } from '../auth/session.store'
import { AppDrawer } from './app-drawer'
import { useNavigationStore } from './navigation.store'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

function signIn(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'u1',
      fullName: 'Ana Paula Souza',
      email: 'ana@pulso.test',
      role,
      clinicId: 'c1',
    },
  })
}

describe('AppDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    signIn(UserRole.ADMIN)
    useNavigationStore.setState({ isDrawerOpen: true })
  })

  it('não aparece enquanto está fechado', async () => {
    useNavigationStore.setState({ isDrawerOpen: false })

    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.queryByTestId('drawer-items')).toBeNull()
  })

  it('lista os itens do perfil, na ordem da web', async () => {
    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.getByTestId('drawer-item-dashboard')).toBeTruthy()
    expect(screen.getByText('Consultas')).toBeTruthy()
    expect(screen.getByTestId('drawer-item-schedules')).toBeTruthy()
  })

  it('a recepção não vê usuários nem agendas', async () => {
    signIn(UserRole.USER)

    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.queryByTestId('drawer-item-users')).toBeNull()
    expect(screen.queryByTestId('drawer-item-schedules')).toBeNull()
  })

  // O item ativo é o único que carrega o fundo do acento, como na web.
  it('destaca o item da tela atual', async () => {
    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.getByTestId('drawer-item-appointments')).not.toHaveStyle({
      backgroundColor: 'transparent',
    })
    expect(screen.getByTestId('drawer-item-dashboard')).toHaveStyle({
      backgroundColor: 'transparent',
    })
  })

  it('navega e fecha ao tocar num item disponível', async () => {
    await renderWithProviders(<AppDrawer activeId="dashboard" />)

    fireEvent.press(screen.getByTestId('drawer-item-appointments'))

    expect(mockReplace).toHaveBeenCalledWith('/(app)')
    expect(useNavigationStore.getState().isDrawerOpen).toBe(false)
  })

  // A tela ainda não portada aparece apagada, não escondida: a lista é o mapa
  // do sistema, e esconder metade dela faria o app parecer outro produto.
  it('o item sem tela fica apagado e não navega', async () => {
    await renderWithProviders(<AppDrawer activeId="appointments" />)

    const dashboard = screen.getByTestId('drawer-item-dashboard')
    expect(dashboard).toHaveStyle({ opacity: 0.4 })

    fireEvent.press(dashboard)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('fecha ao tocar fora', async () => {
    await renderWithProviders(<AppDrawer activeId="appointments" />)

    fireEvent.press(screen.getByTestId('drawer-backdrop'))

    expect(useNavigationStore.getState().isDrawerOpen).toBe(false)
  })

  it('mostra quem está logado no rodapé', async () => {
    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.getByText('Ana Paula Souza')).toBeTruthy()
    expect(screen.getByText('ana@pulso.test')).toBeTruthy()
    // "Ana Paula Souza" → "AS", o mesmo cálculo do avatar da web.
    expect(screen.getByText('AS')).toBeTruthy()
  })

  it('sobrevive a não haver usuário', async () => {
    useSessionStore.setState({ status: 'loading', user: null })

    await renderWithProviders(<AppDrawer activeId="appointments" />)

    expect(screen.queryByTestId('drawer-user')).toBeNull()
    expect(screen.getByTestId('drawer-items')).toBeTruthy()
  })
})
