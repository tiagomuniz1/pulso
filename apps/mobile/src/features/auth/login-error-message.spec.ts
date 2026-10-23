import { loginErrorMessage } from './login-error-message'

const error = (overrides: Partial<Parameters<typeof loginErrorMessage>[0]> = {}) =>
  ({ status: 500, title: 'x', detail: 'y', ...overrides }) as Parameters<
    typeof loginErrorMessage
  >[0]

describe('loginErrorMessage', () => {
  it('401 é credencial errada', () => {
    expect(loginErrorMessage(error({ status: 401 }))).toMatch(/incorretos/)
  })

  /**
   * O captcha da web é um widget Turnstile, que não existe aqui. Enquanto
   * não houver equivalente nativo, a saída honesta é mandar a pessoa para o
   * site em vez de repetir "credenciais inválidas" para sempre.
   */
  it.each([
    ['o backend pede captcha', { status: 401, requiresCaptcha: true }],
    ['o limitador recusa', { status: 429 }],
  ])('%s manda entrar pelo site', (_caso, overrides) => {
    expect(loginErrorMessage(error(overrides))).toMatch(/Entre pelo site/)
  })

  /**
   * Falha de rede não é senha errada. Dizer que é faria a pessoa trocar a
   * senha de uma conta que estava perfeita — foi o que aconteceu aqui, com
   * o servidor no ar e o aparelho sem rota até ele.
   */
  it.each([
    ['sem rede', 500],
    ['servidor fora', 503],
    ['gateway', 502],
  ])('%s fala de conexão, não de credencial', (_caso, status) => {
    const message = loginErrorMessage(error({ status }))

    expect(message).toMatch(/conexão/)
    expect(message).not.toMatch(/senha/)
  })
})
