import type { UserRole } from '@app/shared'
import { apiClient } from '../../lib/api-client'
import { clearSession, readSession, writeSession } from '../../lib/token-storage'

export interface SessionUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string | null
}

interface TokenResponse {
  user: SessionUser
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshTokenExpiresIn: number
}

export interface LoginInput {
  email: string
  password: string
  /** Slug da clínica — é o que resolve o tenant no login. Depois disso o
   *  `clinicId` viaja no próprio JWT e o app nunca mais precisa dele. */
  slug: string
  captchaToken?: string
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const response = await apiClient.post<TokenResponse>('/auth/token', input)
  await writeSession({ accessToken: response.accessToken, refreshToken: response.refreshToken })
  return response.user
}

/**
 * Sai da conta revogando o refresh token no servidor.
 *
 * A credencial local é apagada **em todo caso**, inclusive se a chamada falhar:
 * entre deixar o usuário preso numa sessão que ele pediu para encerrar e perder
 * a revogação remota, perder a revogação é o mal menor — e a próxima tentativa
 * de refresh vai falhar de qualquer forma.
 */
export async function logout(): Promise<void> {
  const session = await readSession()

  try {
    if (session) await apiClient.post<void>('/auth/token/logout', { refreshToken: session.refreshToken })
  } finally {
    await clearSession()
  }
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  return apiClient.get<SessionUser>('/auth/me')
}
