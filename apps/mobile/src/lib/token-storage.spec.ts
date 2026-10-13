import * as SecureStore from 'expo-secure-store'
import { clearSession, readSession, writeSession } from './token-storage'

const mockStore = (SecureStore as unknown as { __store: Map<string, string> }).__store

describe('token-storage', () => {
  beforeEach(() => {
    mockStore.clear()
    jest.clearAllMocks()
  })

  it('grava e lê o par de tokens', async () => {
    await writeSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })

    expect(await readSession()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' })
  })

  it('devolve null quando não há sessão', async () => {
    expect(await readSession()).toBeNull()
  })

  // Um sem o outro é sessão quebrada, não parcial: sem refresh não há como
  // renovar, e o app pareceria logado até a primeira requisição falhar.
  it('trata sessão pela metade como ausente', async () => {
    await SecureStore.setItemAsync('pulso.accessToken', 'access-sozinho')

    expect(await readSession()).toBeNull()
  })

  it('apaga os dois tokens', async () => {
    await writeSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })

    await clearSession()

    expect(await readSession()).toBeNull()
    expect(mockStore.size).toBe(0)
  })

  // O Keychain é o ponto da escolha: `AsyncStorage` entraria em backup do
  // aparelho em texto claro, levando junto sete dias de acesso a prontuário.
  it('usa o armazenamento seguro, não o comum', async () => {
    await writeSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pulso.accessToken', 'access-1')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pulso.refreshToken', 'refresh-1')
  })
})
