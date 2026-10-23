import type { IApiClient } from './api-client.contract'
import { apiClient, resetApiClient, setApiClient } from './api-client.registry'

function makeClient(): jest.Mocked<IApiClient> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    getBlob: jest.fn(),
  }
}

describe('registro do cliente HTTP', () => {
  afterEach(() => resetApiClient())

  it.each([
    ['get', () => apiClient.get('/u'), (c: jest.Mocked<IApiClient>) => c.get, ['/u']],
    ['post', () => apiClient.post('/u', { a: 1 }), (c: jest.Mocked<IApiClient>) => c.post, ['/u', { a: 1 }]],
    ['put', () => apiClient.put('/u', { a: 1 }), (c: jest.Mocked<IApiClient>) => c.put, ['/u', { a: 1 }]],
    ['patch', () => apiClient.patch('/u', { a: 1 }), (c: jest.Mocked<IApiClient>) => c.patch, ['/u', { a: 1 }]],
    ['delete', () => apiClient.delete('/u'), (c: jest.Mocked<IApiClient>) => c.delete, ['/u']],
    ['getBlob', () => apiClient.getBlob('/u'), (c: jest.Mocked<IApiClient>) => c.getBlob, ['/u']],
  ])('encaminha %s para o cliente registrado', async (_verb, call, pick, args) => {
    const client = makeClient()
    setApiClient(client)

    await call()

    expect(pick(client)).toHaveBeenCalledWith(...args)
  })

  // Devolver um dublê silencioso faria a tela abrir vazia, sem erro, e a
  // investigação começaria pelo backend.
  it('lança quando o app esqueceu de registrar', () => {
    expect(() => apiClient.get('/u')).toThrow('nenhum cliente HTTP registrado')
  })

  it('o último registro vence', async () => {
    const primeiro = makeClient()
    const segundo = makeClient()
    setApiClient(primeiro)
    setApiClient(segundo)

    await apiClient.get('/u')

    expect(primeiro.get).not.toHaveBeenCalled()
    expect(segundo.get).toHaveBeenCalledWith('/u')
  })
})
