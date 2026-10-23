import { create, isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import Constants from 'expo-constants'
import { clearSession, readSession, writeSession } from './token-storage'

/**
 * Cliente HTTP do app.
 *
 * Mesma interface do `apiClient` da web, outra implementação: aqui não há
 * cookie de navegador. O backend aceita `Authorization: Bearer` em toda rota
 * autenticada (`JwtStrategy` tem `fromAuthHeaderAsBearerToken()` como segundo
 * extractor), e o `clinicId` vem do próprio JWT — por isso o app não envia
 * `x-clinic-slug` em lugar nenhum. O slug só existe no login.
 */

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export interface IApiError {
  status: number
  title: string
  detail: string
  errors?: { field: string; message: string }[]
  requiresCaptcha?: boolean
}

const baseURL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? ''

/**
 * A instância que o `apiClient` embrulha.
 *
 * Exposta porque o download de PDF (fase 3) precisa de `responseType`, que a
 * interface enxuta do `apiClient` não carrega — e porque é nela que os testes
 * penduram o adapter para exercitar os interceptors de verdade.
 */
export const httpClient = create({ baseURL })

const client = httpClient

/**
 * Instância sem interceptor nenhum, só para renovar a sessão.
 *
 * Se o refresh passasse pelo `httpClient`, o 401 do próprio refresh cairia no
 * interceptor de resposta e dispararia outro refresh — e esse, outro.
 */
export const refreshClient = create({ baseURL })

/** Chamado quando a sessão morre de vez — a navegação reage a isto. */
let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(handler: (() => void) | null): void {
  onSessionExpired = handler
}

client.interceptors.request.use(async (config) => {
  const session = await readSession()
  if (session) config.headers.Authorization = `Bearer ${session.accessToken}`
  return config
})

function normalizeProblemDetails(error: unknown): IApiError {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Partial<IApiError>
    return {
      status: data.status ?? error.response.status,
      title: data.title ?? 'Error',
      detail: data.detail ?? error.message,
      errors: data.errors,
      requiresCaptcha: data.requiresCaptcha,
    }
  }
  return {
    status: 500,
    title: 'Internal Error',
    detail: error instanceof Error ? error.message : 'An unexpected error occurred',
  }
}

/**
 * Um refresh por vez, compartilhado por todas as requisições que tomaram 401
 * juntas.
 *
 * O backend **rotaciona** o refresh token: emitir um novo revoga o anterior. Uma
 * tela que dispara várias queries de uma vez tinha todas expirando no mesmo
 * instante, e cada uma chamava o refresh por conta própria — a primeira revogava
 * o token que as outras estavam usando, e as perdedoras caíam no login no meio
 * de uma sessão válida. É bug já pago na web (ver `lib/api-client.ts` lá).
 *
 * No celular é pior: o app volta do segundo plano com *tudo* expirado ao mesmo
 * tempo, então a corrida é a regra, não a exceção.
 */
let inFlightRefresh: Promise<void> | null = null

function refreshSession(): Promise<void> {
  if (inFlightRefresh) return inFlightRefresh

  inFlightRefresh = (async () => {
    const session = await readSession()
    if (!session) throw new Error('No session to refresh')

    const { data } = await refreshClient.post<{ accessToken: string; refreshToken: string }>(
      '/auth/token/refresh',
      { refreshToken: session.refreshToken },
    )

    await writeSession({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  })().finally(() => {
    inFlightRefresh = null
  })

  return inFlightRefresh
}

client.interceptors.response.use(
  (response) => response.data,
  async (error: unknown) => {
    const requestUrl = isAxiosError(error) ? (error.config?.url ?? '') : ''
    const isAuthEndpoint = requestUrl.includes('/auth/token')

    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      !(error.config as RetryableConfig)?._retry
    ) {
      const config = error.config as RetryableConfig
      config._retry = true
      try {
        await refreshSession()
        return client(config)
      } catch {
        // O refresh falhou: o token foi revogado, expirou ou a conta saiu do ar.
        // Apaga a sessão antes de avisar, para nenhuma tela reagir com uma
        // credencial que já se sabe morta.
        await clearSession()
        onSessionExpired?.()
      }
    }

    return Promise.reject(normalizeProblemDetails(error))
  },
)

/**
 * O interceptor de resposta devolve `response.data`, então em runtime o valor
 * já é `T` — mas a tipagem do axios continua descrevendo a resposta inteira.
 * A asserção mora aqui, num lugar só, em vez de espalhada por cada chamada.
 */
function unwrap<T>(promise: Promise<unknown>): Promise<T> {
  return promise as Promise<T>
}

export const apiClient = {
  get: <T>(url: string): Promise<T> => unwrap<T>(client.get(url)),
  post: <T>(url: string, data?: unknown): Promise<T> => unwrap<T>(client.post(url, data)),
  put: <T>(url: string, data?: unknown): Promise<T> => unwrap<T>(client.put(url, data)),
  patch: <T>(url: string, data?: unknown): Promise<T> => unwrap<T>(client.patch(url, data)),
  delete: <T>(url: string): Promise<T> => unwrap<T>(client.delete(url)),
  /**
   * PDFs e anexos.
   *
   * Vai direto no `client`, sem o `unwrap`: o interceptor devolve
   * `response.data`, que aqui já é o próprio Blob. Entregar o arquivo ao
   * usuário é outra história — `expo-file-system` mais `expo-sharing`, na
   * fase 3; o que o core precisa é só dos bytes.
   */
  getBlob: (url: string): Promise<Blob> =>
    unwrap<Blob>(client.get(url, { responseType: 'blob' })),
}
