import { setApiClient } from '@app/core'
import { apiClient } from './api-client'

/**
 * Entrega ao `@app/core` o cliente HTTP deste app.
 *
 * O core descreve o que precisa e não sabe de transporte: aqui é
 * `Authorization: Bearer` com renovação de voo único, na web é cookie
 * `httpOnly` com `x-clinic-slug`. Um mapper não deve ter opinião sobre isso.
 *
 * Chamado no escopo do módulo do layout raiz, antes de qualquer tela montar —
 * a primeira query dispara no primeiro render.
 */
export function registerCoreApiClient(): void {
  setApiClient(apiClient)
}
