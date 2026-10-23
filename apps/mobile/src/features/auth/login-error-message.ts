import type { IApiError } from '../../lib/api-client'

/**
 * O que a tela de login diz para cada falha.
 *
 * `401` é a única que de fato fala de credencial. `429` e o captcha são
 * excesso de tentativas. O resto — rede fora, servidor fora, endereço errado
 * no `.env` — chega como `500` do próprio cliente, e tem de ser dito como é.
 *
 * O app dizia "e-mail, senha ou clínica incorretos" para **qualquer** falha,
 * e quem lesse isso iria trocar a senha de uma conta que estava perfeita.
 * Custou uma hora de investigação aqui dentro, com o servidor no ar e as
 * credenciais certas — era o aparelho sem rota até ele.
 *
 * Mora fora de `src/app/` porque ali são arquivos de rota, que o jest não
 * mede: lógica escondida numa tela é lógica sem teste.
 */
export function loginErrorMessage(error: IApiError): string {
  if (error.requiresCaptcha || error.status === 429) {
    return 'Muitas tentativas. Entre pelo site para continuar.'
  }
  if (error.status === 401) return 'E-mail, senha ou clínica incorretos.'
  return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
}
