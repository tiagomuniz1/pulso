/**
 * O contrato que o `@app/core` exige de quem o hospeda.
 *
 * A camada de dados é a mesma nos dois clientes, mas o transporte não é: na web
 * a sessão viaja em cookie `httpOnly` e o cliente injeta `x-clinic-slug`; no app
 * é `Authorization: Bearer` e o `clinicId` vem do JWT. Nada disso interessa a um
 * mapper ou a um use-case — por isso o core descreve o que precisa e cada app
 * entrega a sua implementação.
 */
export interface IApiClient {
  get<T>(url: string): Promise<T>
  post<T>(url: string, data?: unknown): Promise<T>
  put<T>(url: string, data?: unknown): Promise<T>
  patch<T>(url: string, data?: unknown): Promise<T>
  delete<T>(url: string): Promise<T>
  /** PDFs e anexos. A *entrega* do arquivo ao usuário é de cada app. */
  getBlob(url: string): Promise<Blob>
}

/** Erro já normalizado — Problem Details (RFC 9457) achatado. */
export interface IApiError {
  status: number
  title: string
  detail: string
  errors?: Array<{ field: string; message: string }>
  requiresCaptcha?: boolean
}
