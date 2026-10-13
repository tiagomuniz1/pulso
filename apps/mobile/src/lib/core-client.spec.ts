import { setApiClient } from '@app/core'
import { apiClient } from './api-client'
import { registerCoreApiClient } from './core-client'

// Içado pelo babel para antes dos imports; a ordem aqui é a da leitura.
jest.mock('@app/core', () => ({ setApiClient: jest.fn() }))

/**
 * Nenhum outro teste chega aqui: os specs de tela mockam os use-cases e nunca
 * tocam o cliente de verdade. Sem isto, apagar a chamada no layout raiz
 * deixaria a suíte verde e faria toda tela do app lançar na primeira query.
 */
describe('registerCoreApiClient', () => {
  it('registra o cliente deste app no core', () => {
    registerCoreApiClient()

    expect(setApiClient).toHaveBeenCalledWith(apiClient)
  })

  it('o cliente registrado sabe buscar arquivo binário', () => {
    expect(apiClient.getBlob).toBeInstanceOf(Function)
  })
})
