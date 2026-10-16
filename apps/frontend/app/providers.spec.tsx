jest.mock('@app/core/src/api/api-client.registry')

import { apiClient as coreApiClient, setApiClient } from '@app/core'
import { apiClient } from '@/lib/api-client'

/**
 * O registro acontece no escopo do módulo, e nenhum outro teste o exercita: os
 * specs de hook e de componente mockam os use-cases e nunca chegam ao cliente
 * de verdade. Apagar a linha do `providers.tsx` deixaria a suíte inteira verde
 * e quebraria toda chamada de API em produção, na primeira tela que abrisse.
 */
describe('bootstrap do @app/core', () => {
  it('registra o cliente HTTP da web ao carregar os Providers', async () => {
    await import('./providers')

    expect(setApiClient).toHaveBeenCalledWith(apiClient)
  })

  // O core não sabe de cookie nem de `x-clinic-slug` — quem sabe é este
  // cliente, e é por isso que é ele, e não um genérico, que entra ali.
  it('o cliente registrado é o da web, não o do core', () => {
    expect(apiClient).not.toBe(coreApiClient)
    expect(apiClient.getBlob).toBeInstanceOf(Function)
  })
})
