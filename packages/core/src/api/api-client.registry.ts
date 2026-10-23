import type { IApiClient } from './api-client.contract'

/**
 * Onde o app registra o seu cliente HTTP.
 *
 * Um registro, e não um parâmetro em cada service, porque o cliente é único e
 * imutável durante a vida do processo: passá-lo adiante por trinta assinaturas
 * seria cerimônia sem nenhuma decisão por trás.
 *
 * Lançar quando não foi registrado, em vez de devolver um dublê silencioso: sem
 * isso, esquecer o `setApiClient` no bootstrap viraria uma tela vazia sem erro,
 * e a investigação começaria pelo backend.
 */
let registered: IApiClient | null = null

export function setApiClient(client: IApiClient): void {
  registered = client
}

/** Só para testes — devolve o registro ao estado de "app não inicializado". */
export function resetApiClient(): void {
  registered = null
}

function required(): IApiClient {
  if (!registered) {
    throw new Error(
      '@app/core: nenhum cliente HTTP registrado. Chame setApiClient() no bootstrap do app.',
    )
  }
  return registered
}

export const apiClient: IApiClient = {
  get: <T>(url: string): Promise<T> => required().get<T>(url),
  post: <T>(url: string, data?: unknown): Promise<T> => required().post<T>(url, data),
  put: <T>(url: string, data?: unknown): Promise<T> => required().put<T>(url, data),
  patch: <T>(url: string, data?: unknown): Promise<T> => required().patch<T>(url, data),
  delete: <T>(url: string): Promise<T> => required().delete<T>(url),
  getBlob: (url: string): Promise<Blob> => required().getBlob(url),
}
