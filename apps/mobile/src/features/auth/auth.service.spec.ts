import * as SecureStore from 'expo-secure-store'
import { apiClient } from '../../lib/api-client'
import { readSession, writeSession } from '../../lib/token-storage'
import { fetchCurrentUser, login, logout } from './auth.service'

// `jest.mock` é içado pelo babel para antes dos imports, então a ordem aqui é
// a da leitura, não a da execução.
jest.mock('../../lib/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}))

const mockApi = apiClient as jest.Mocked<typeof apiClient>
const mockStore = (SecureStore as unknown as { __store: Map<string, string> }).__store

const USER = { id: 'u1', fullName: 'Dra. Ana', email: 'ana@pulso.test', role: 'admin', clinicId: 'c1' }

describe('auth.service', () => {
  beforeEach(() => {
    mockStore.clear()
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('guarda os tokens e devolve o perfil', async () => {
      mockApi.post.mockResolvedValue({ user: USER, accessToken: 'a1', refreshToken: 'r1' })

      expect(await login({ email: 'ana@pulso.test', password: 'x', slug: 'pulso' })).toEqual(USER)
      expect(mockApi.post).toHaveBeenCalledWith('/auth/token', {
        email: 'ana@pulso.test',
        password: 'x',
        slug: 'pulso',
      })
      expect(await readSession()).toEqual({ accessToken: 'a1', refreshToken: 'r1' })
    })

    it('não guarda nada quando o login falha', async () => {
      mockApi.post.mockRejectedValue({ status: 401 })

      await expect(login({ email: 'ana@pulso.test', password: 'x', slug: 'pulso' })).rejects.toBeDefined()
      expect(await readSession()).toBeNull()
    })
  })

  describe('logout', () => {
    it('revoga o refresh token no servidor e apaga o local', async () => {
      await writeSession({ accessToken: 'a1', refreshToken: 'r1' })
      mockApi.post.mockResolvedValue(undefined)

      await logout()

      expect(mockApi.post).toHaveBeenCalledWith('/auth/token/logout', { refreshToken: 'r1' })
      expect(await readSession()).toBeNull()
    })

    // Deixar o usuário preso numa sessão que ele pediu para encerrar é pior do
    // que perder a revogação remota — que o próximo refresh derrubaria de todo
    // jeito.
    it('apaga o local mesmo se a revogação falhar', async () => {
      await writeSession({ accessToken: 'a1', refreshToken: 'r1' })
      mockApi.post.mockRejectedValue({ status: 500 })

      await expect(logout()).rejects.toBeDefined()
      expect(await readSession()).toBeNull()
    })

    it('não chama o servidor quando não há sessão', async () => {
      await logout()

      expect(mockApi.post).not.toHaveBeenCalled()
    })
  })

  it('fetchCurrentUser lê /auth/me', async () => {
    mockApi.get.mockResolvedValue(USER)

    expect(await fetchCurrentUser()).toEqual(USER)
    expect(mockApi.get).toHaveBeenCalledWith('/auth/me')
  })
})
