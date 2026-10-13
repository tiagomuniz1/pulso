import { AxiosError } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { apiClient, httpClient, refreshClient, setOnSessionExpired } from './api-client'
import { readSession, writeSession } from './token-storage'

const mockStore = (SecureStore as unknown as { __store: Map<string, string> }).__store

// Duas instâncias, de propósito: as chamadas normais passam pelo `httpClient`
// (com os interceptors), e o refresh pelo `refreshClient`, que não os tem para
// não reentrar neles. O teste intercepta as duas abaixo dos interceptors — é o
// que faz exercitar o refresh de verdade, em vez de um dublê dele.
let mock: MockAdapter
let refreshMock: MockAdapter

const REFRESH_URL = '/auth/token/refresh'
const NEW_TOKENS = { accessToken: 'access-novo', refreshToken: 'refresh-novo' }

describe('api-client', () => {
  beforeEach(async () => {
    mockStore.clear()
    jest.clearAllMocks()
    setOnSessionExpired(null)
    mock = new MockAdapter(httpClient)
    refreshMock = new MockAdapter(refreshClient)
    await writeSession({ accessToken: 'access-velho', refreshToken: 'refresh-velho' })
  })

  afterEach(() => {
    mock.restore()
    refreshMock.restore()
  })

  function refreshCalls(): number {
    return refreshMock.history.post.filter((r) => r.url === REFRESH_URL).length
  }

  it('manda o access token como Bearer', async () => {
    mock.onGet('/patients').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer access-velho')
      return [200, { data: [] }]
    })

    await apiClient.get('/patients')
    expect(mock.history.get).toHaveLength(1)
  })

  // O tenant vem do JWT; mandar o slug seria ruído que só a web precisa.
  it('não manda x-clinic-slug', async () => {
    mock.onGet('/patients').reply((config) => {
      expect(config.headers?.['x-clinic-slug']).toBeUndefined()
      return [200, {}]
    })

    await apiClient.get('/patients')
  })

  it('desembrulha o corpo da resposta', async () => {
    mock.onGet('/auth/me').reply(200, { id: 'u1', fullName: 'Ana' })

    expect(await apiClient.get('/auth/me')).toEqual({ id: 'u1', fullName: 'Ana' })
  })

  it('normaliza o erro do backend para IApiError', async () => {
    mock.onGet('/patients').reply(422, { status: 422, title: 'Unprocessable', detail: 'CPF inválido' })

    await expect(apiClient.get('/patients')).rejects.toMatchObject({
      status: 422,
      detail: 'CPF inválido',
    })
  })

  it('normaliza erro sem corpo do backend', async () => {
    mock.onGet('/patients').networkError()

    await expect(apiClient.get('/patients')).rejects.toMatchObject({ status: 500 })
  })

  // Um 500 do nginx ou do balanceador não vem em Problem Details — vem sem
  // corpo útil. A tela ainda precisa de status, título e texto para mostrar.
  it('preenche os campos que o corpo do erro não trouxe', async () => {
    mock.onGet('/patients').reply(502, {})

    await expect(apiClient.get('/patients')).rejects.toMatchObject({
      status: 502,
      title: 'Error',
      detail: expect.any(String),
      errors: undefined,
      requiresCaptcha: undefined,
    })
  })

  // Nem tudo que rejeita é erro do axios: um throw dentro do adapter, ou uma
  // rejeição com valor cru, chegaria aqui sem `response` e sem `config`.
  it('normaliza o que nem é erro do axios', async () => {
    mock.onGet('/patients').reply(() => Promise.reject('cabo arrancado'))

    await expect(apiClient.get('/patients')).rejects.toEqual({
      status: 500,
      title: 'Internal Error',
      detail: 'An unexpected error occurred',
    })
  })

  it('normaliza erro do axios sem config', async () => {
    mock.onGet('/patients').reply(() => Promise.reject(new AxiosError('abortado')))

    await expect(apiClient.get('/patients')).rejects.toMatchObject({
      status: 500,
      detail: 'abortado',
    })
  })

  // Os quatro verbos passam pelo mesmo desembrulho; sem exercitá-los, uma
  // troca errada em qualquer um passaria em silêncio.
  it.each([
    ['put', () => apiClient.put('/patients/1', { a: 1 })],
    ['patch', () => apiClient.patch('/patients/1', { a: 1 })],
    ['delete', () => apiClient.delete('/patients/1')],
  ])('%s devolve o corpo desembrulhado', async (verb, call) => {
    mock.onPut('/patients/1').reply(200, { ok: verb })
    mock.onPatch('/patients/1').reply(200, { ok: verb })
    mock.onDelete('/patients/1').reply(200, { ok: verb })

    expect(await call()).toEqual({ ok: verb })
  })

  describe('renovação de sessão', () => {
    it('renova no 401 e repete a requisição original', async () => {
      mock.onGet('/patients').replyOnce(401).onGet('/patients').replyOnce(200, { data: ['ok'] })
      refreshMock.onPost(REFRESH_URL).replyOnce(200, NEW_TOKENS)

      expect(await apiClient.get('/patients')).toEqual({ data: ['ok'] })
      expect(await readSession()).toEqual(NEW_TOKENS)
    })

    /**
     * O coração disto.
     *
     * O backend **rotaciona** o refresh token: emitir um novo revoga o anterior.
     * Três telas expirando juntas — o que no celular é a regra, não a exceção,
     * porque o app volta do segundo plano com tudo vencido — chamariam o refresh
     * três vezes, e as duas últimas usariam um token que a primeira acabou de
     * revogar. O usuário cairia no login no meio de uma sessão válida.
     */
    it('faz um refresh só para várias requisições que expiram juntas', async () => {
      mock
        .onGet('/a')
        .replyOnce(401)
        .onGet('/b')
        .replyOnce(401)
        .onGet('/c')
        .replyOnce(401)
        .onGet('/a')
        .reply(200, { ok: 'a' })
        .onGet('/b')
        .reply(200, { ok: 'b' })
        .onGet('/c')
        .reply(200, { ok: 'c' })
      refreshMock.onPost(REFRESH_URL).reply(200, NEW_TOKENS)

      const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')])

      expect(results).toEqual([{ ok: 'a' }, { ok: 'b' }, { ok: 'c' }])
      expect(refreshCalls()).toBe(1)
    })

    it('apaga a sessão e avisa quando o refresh falha', async () => {
      const onExpired = jest.fn()
      setOnSessionExpired(onExpired)

      mock.onGet('/patients').reply(401)
      refreshMock.onPost(REFRESH_URL).reply(401)

      await expect(apiClient.get('/patients')).rejects.toBeDefined()

      expect(await readSession()).toBeNull()
      expect(onExpired).toHaveBeenCalledTimes(1)
    })

    it('não renova quando não há sessão guardada', async () => {
      mockStore.clear()
      mock.onGet('/patients').reply(401)

      await expect(apiClient.get('/patients')).rejects.toBeDefined()

      expect(refreshCalls()).toBe(0)
    })

    // Sem isto, um 401 do próprio endpoint de token dispararia um refresh, que
    // tomaria 401, que dispararia outro.
    it('não tenta renovar quando quem falhou foi o endpoint de token', async () => {
      mock.onPost('/auth/token').reply(401)

      await expect(apiClient.post('/auth/token', {})).rejects.toBeDefined()

      expect(refreshCalls()).toBe(0)
    })

    // Uma requisição só pode ser repetida uma vez: sem a marca `_retry`, um 401
    // persistente viraria laço infinito de renovar e repetir.
    it('repete a requisição no máximo uma vez', async () => {
      mock.onGet('/patients').reply(401)
      refreshMock.onPost(REFRESH_URL).reply(200, NEW_TOKENS)

      await expect(apiClient.get('/patients')).rejects.toBeDefined()

      expect(mock.history.get.filter((r) => r.url === '/patients')).toHaveLength(2)
    })
  })
})

/**
 * O app sem `extra.apiUrl` é um app que não fala com nada. Hoje o
 * `app.config.ts` sempre preenche, mas o fallback existe e precisa ser o
 * vazio — uma URL chutada mandaria prontuário para o host errado.
 */
describe('api-client sem apiUrl configurada', () => {
  it('cai em baseURL vazia', () => {
    const constants = Constants as unknown as { expoConfig: unknown }
    const original = constants.expoConfig
    constants.expoConfig = null

    try {
      jest.isolateModules(() => {
        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        const { httpClient: semUrl } = require('./api-client') as typeof import('./api-client')

        expect(semUrl.defaults.baseURL).toBe('')
      })
    } finally {
      constants.expoConfig = original
    }
  })
})
