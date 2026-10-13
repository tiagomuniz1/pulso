import * as SecureStore from 'expo-secure-store'

/**
 * Onde as credenciais do app vivem.
 *
 * `expo-secure-store` grava no Keychain (iOS) e no Keystore (Android), não em
 * `AsyncStorage`: o refresh token vale sete dias e dá acesso a prontuário de
 * paciente — em armazenamento comum, qualquer backup do aparelho o levaria
 * junto, em texto claro.
 *
 * O access token também fica aqui, e não só em memória, para o app reabrir sem
 * pedir senha a cada vez que o sistema mata o processo em segundo plano.
 */
const ACCESS_TOKEN_KEY = 'pulso.accessToken'
const REFRESH_TOKEN_KEY = 'pulso.refreshToken'

export interface StoredSession {
  accessToken: string
  refreshToken: string
}

export async function readSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ])

  // Um sem o outro é sessão quebrada, não sessão parcial: sem refresh não há
  // como renovar, e sem access não há como usar. Tratar como ausente evita um
  // estado em que o app parece logado e falha na primeira requisição.
  if (!accessToken || !refreshToken) return null

  return { accessToken, refreshToken }
}

export async function writeSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
  ])
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ])
}
