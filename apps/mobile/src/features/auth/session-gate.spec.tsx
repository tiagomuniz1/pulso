import { Text } from 'react-native'
import { act, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { setOnSessionExpired } from '../../lib/api-client'
import { readSession } from '../../lib/token-storage'
import { fetchCurrentUser } from './auth.service'
import { SessionGate } from './session-gate'
import { useSessionStore } from './session.store'

jest.mock('../../lib/token-storage')
jest.mock('./auth.service')
jest.mock('../../lib/api-client', () => ({ setOnSessionExpired: jest.fn() }))

const mockSegments = { current: [] as string[] }
const mockRedirect = jest.fn()

jest.mock('expo-router', () => ({
  useSegments: () => mockSegments.current,
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href)
    return null
  },
}))

const mockRead = readSession as jest.MockedFunction<typeof readSession>
const mockMe = fetchCurrentUser as jest.MockedFunction<typeof fetchCurrentUser>
const mockOnExpired = setOnSessionExpired as jest.MockedFunction<typeof setOnSessionExpired>

const user = { id: 'u1', fullName: 'Ana', email: 'a@b.c', role: 'admin', clinicId: 'c1' } as never

beforeEach(() => {
  jest.clearAllMocks()
  mockSegments.current = []
  useSessionStore.setState({ status: 'loading', user: null })
})

async function open() {
  return renderWithProviders(
    <SessionGate>
      <Text testID="conteudo">conteúdo</Text>
    </SessionGate>,
  )
}

describe('SessionGate', () => {
  it('sem sessão guardada, fica anônimo', async () => {
    mockRead.mockResolvedValue(null)

    await open()

    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'))
    expect(mockMe).not.toHaveBeenCalled()
  })

  /**
   * Valida contra o servidor em vez de confiar no token guardado: ele pode
   * ter sido revogado enquanto o app estava fechado, e aí a pessoa entraria
   * numa tela que falha inteira.
   */
  it('com sessão guardada, confirma quem é no servidor', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockResolvedValue(user)

    await open()

    await waitFor(() => expect(useSessionStore.getState().status).toBe('authenticated'))
    expect(useSessionStore.getState().user).toEqual(user)
  })

  it('token recusado pelo servidor cai para anônimo', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockRejectedValue(new Error('401'))

    await open()

    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'))
  })

  /**
   * Enquanto lê o Keychain não desvia nada: desviar por um estado que ainda
   * não se conhece mandaria para o login quem tem sessão válida.
   */
  it('enquanto lê o Keychain, não desvia', async () => {
    mockRead.mockReturnValue(new Promise(() => {}))

    await open()

    expect(screen.getByTestId('conteudo')).toBeTruthy()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('autenticado fora da área logada vai para a agenda', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockResolvedValue(user)
    mockSegments.current = ['login']

    await open()

    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/(app)'))
  })

  /**
   * **O desvio acompanha a navegação, não ocupa o lugar dela.** Devolver só
   * o `<Redirect>` desmontava o navegador junto, e aí os segmentos voltavam
   * a vazio: a condição "fora da área logada" nunca mais era falsa e o
   * React derrubava o app com "Maximum update depth exceeded".
   */
  it('a navegação continua montada enquanto desvia', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockResolvedValue(user)
    mockSegments.current = ['login']

    await open()

    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/(app)'))
    expect(screen.getByTestId('conteudo')).toBeTruthy()
  })

  it('autenticado já na área logada fica onde está', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockResolvedValue(user)
    mockSegments.current = ['(app)']

    await open()

    await waitFor(() => expect(screen.getByTestId('conteudo')).toBeTruthy())
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('anônimo dentro da área logada vai para o login', async () => {
    mockRead.mockResolvedValue(null)
    mockSegments.current = ['(app)']

    await open()

    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/login'))
  })

  it('anônimo fora da área logada fica no login', async () => {
    mockRead.mockResolvedValue(null)
    mockSegments.current = ['login']

    await open()

    await waitFor(() => expect(screen.getByTestId('conteudo')).toBeTruthy())
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  // O api-client avisa quando o refresh falha de vez; o desvio reage.
  it('expiração avisada pelo api-client derruba a sessão', async () => {
    mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
    mockMe.mockResolvedValue(user)
    mockSegments.current = ['(app)']

    await open()
    await waitFor(() => expect(useSessionStore.getState().status).toBe('authenticated'))

    const onExpired = mockOnExpired.mock.calls[0][0] as () => void
    await act(async () => {
      onExpired()
    })

    expect(useSessionStore.getState().status).toBe('anonymous')
    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/login'))
  })

  it('desmontar solta o aviso de expiração', async () => {
    mockRead.mockResolvedValue(null)

    const { unmount } = await open()
    await waitFor(() => expect(useSessionStore.getState().status).toBe('anonymous'))

    await act(async () => {
      unmount()
    })

    expect(mockOnExpired).toHaveBeenLastCalledWith(null)
  })

  it.each([
    ['confirma quem é', (resolve: (v: unknown) => void) => resolve({ id: 'u1' })],
    ['recusa o token', (_r: unknown, reject: (e: unknown) => void) => reject(new Error('401'))],
  ])(
    'servidor que %s depois de desmontar não mexe na sessão',
    async (_caso, finish) => {
      mockRead.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' } as never)
      let resolve: (value: unknown) => void = () => {}
      let reject: (error: unknown) => void = () => {}
      mockMe.mockReturnValue(
        new Promise((res, rej) => {
          resolve = res
          reject = rej
        }) as never,
      )

      const { unmount } = await open()
      await waitFor(() => expect(mockMe).toHaveBeenCalled())
      await act(async () => {
        unmount()
      })

      await act(async () => {
        finish(resolve, reject)
      })

      expect(useSessionStore.getState().status).toBe('loading')
    },
  )

  /**
   * O `active` existe para o caso de a tela sair antes de o Keychain
   * responder: sem ele, a resposta tardia escreveria na store de um gate
   * que já não está na árvore.
   */
  it('resposta que chega depois de desmontar não mexe na sessão', async () => {
    let resolve: (value: unknown) => void = () => {}
    mockRead.mockReturnValue(new Promise((r) => { resolve = r }) as never)

    const { unmount } = await open()
    await act(async () => {
      unmount()
    })

    await act(async () => {
      resolve(null)
    })

    expect(useSessionStore.getState().status).toBe('loading')
  })
})
