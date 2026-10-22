import { useEffect, useState, type ReactNode } from 'react'
import { Redirect, useSegments } from 'expo-router'
import { setOnSessionExpired } from '../../lib/api-client'
import { readSession } from '../../lib/token-storage'
import { fetchCurrentUser } from './auth.service'
import { useSessionStore } from './session.store'

/**
 * Quem decide, na abertura do app, se a pessoa vê a agenda ou o login.
 *
 * **O desvio é declarativo, e isso não é estilo.** Chamar `router.replace()`
 * de dentro de um efeito no arranque atualizava o estado do navegador
 * enquanto o `ContextNavigator` do expo-router ainda montava, e o React
 * avisava "state update on a component that hasn't mounted yet". Em produção
 * é ruído; em desenvolvimento o LogBox **cobre a tela inteira**, e foi o que
 * derrubou fluxos Maestro depois de a ação sob teste ter dado certo — a
 * falha aparecia num passo seguinte, apontando para o lugar errado.
 *
 * Um `useRootNavigationState()?.key` chegou a guardar a chamada e não
 * bastou: a chave existe assim que o navegador se registra, o que acontece
 * durante o render dele, antes de estar montado. `<Redirect>` navega no
 * `useFocusEffect` — depois da montagem, por construção —, e some com a
 * janela em que dava para errar.
 *
 * Mora fora de `src/app/` de propósito: ali o Jest não mede cobertura, e
 * esta é a decisão mais crítica do arranque do app.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status)
  const setAuthenticated = useSessionStore((state) => state.setAuthenticated)
  const setAnonymous = useSessionStore((state) => state.setAnonymous)
  const segments = useSegments()
  const [bootstrapped, setBootstrapped] = useState(false)

  /**
   * Descobre, uma vez, se há sessão guardada no Keychain.
   *
   * Valida contra o servidor em vez de confiar no token: ele pode ter sido
   * revogado enquanto o app estava fechado, e aí a pessoa entraria numa
   * tela que falha inteira.
   */
  useEffect(() => {
    let active = true

    void (async () => {
      const stored = await readSession()
      if (!stored) {
        if (active) setAnonymous()
      } else {
        try {
          const user = await fetchCurrentUser()
          if (active) setAuthenticated(user)
        } catch {
          if (active) setAnonymous()
        }
      }
      if (active) setBootstrapped(true)
    })()

    return () => {
      active = false
    }
  }, [setAuthenticated, setAnonymous])

  // O api-client avisa quando o refresh falha de vez; o desvio reage.
  useEffect(() => {
    setOnSessionExpired(() => setAnonymous())
    return () => setOnSessionExpired(null)
  }, [setAnonymous])

  /**
   * Para onde desviar, ou `null` para ficar onde está.
   *
   * Enquanto lê o Keychain não desvia nada: decidir por um estado que ainda
   * não se conhece mandaria para o login quem tem sessão válida.
   */
  const inAuthenticatedArea = segments[0] === '(app)'
  const target = !bootstrapped
    ? null
    : status === 'authenticated' && !inAuthenticatedArea
      ? '/(app)'
      : status === 'anonymous' && inAuthenticatedArea
        ? '/login'
        : null

  /**
   * O desvio acompanha a navegação, **não ocupa o lugar dela**.
   *
   * Devolver só o `<Redirect>` desmontava o `<Slot />` junto, e aí os
   * segmentos voltavam a vazio: para quem estava autenticado a condição
   * "fora da área logada" nunca mais era falsa, e o React derrubava o app
   * com "Maximum update depth exceeded". Com o navegador montado ao lado,
   * o desvio acontece, os segmentos mudam e a condição se resolve sozinha.
   *
   * `Redirect` devolve `null`, então renderizá-lo ao lado não custa pixel
   * nenhum.
   */
  return (
    <>
      {target ? <Redirect href={target} /> : null}
      {children}
    </>
  )
}
