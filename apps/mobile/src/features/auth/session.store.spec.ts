import { UserRole } from '@app/shared'
import { useSessionStore } from './session.store'

const USER = { id: 'u1', fullName: 'Dra. Ana', email: 'ana@pulso.test', role: UserRole.ADMIN, clinicId: 'c1' }

describe('session.store', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'loading', user: null })
  })

  // Sem o estado inicial `loading`, o app pisca a tela de login antes de
  // terminar de ler o Keychain.
  it('começa em loading, sem usuário', () => {
    expect(useSessionStore.getState().status).toBe('loading')
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('autentica guardando o usuário', () => {
    useSessionStore.getState().setAuthenticated(USER)

    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(useSessionStore.getState().user).toEqual(USER)
  })

  it('sair limpa o usuário junto com o status', () => {
    useSessionStore.getState().setAuthenticated(USER)

    useSessionStore.getState().setAnonymous()

    expect(useSessionStore.getState().status).toBe('anonymous')
    expect(useSessionStore.getState().user).toBeNull()
  })
})
