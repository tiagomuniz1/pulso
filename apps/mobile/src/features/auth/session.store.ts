import { create } from 'zustand'
import type { SessionUser } from './auth.service'

type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

interface SessionState {
  status: SessionStatus
  user: SessionUser | null
  setAuthenticated: (user: SessionUser) => void
  setAnonymous: () => void
}

/**
 * Estado de sessão, só o suficiente para a navegação decidir o que mostrar.
 *
 * Dado de servidor não mora aqui — é React Query, como na web. O que fica no
 * zustand é quem está logado e se o app já terminou de descobrir isso, que é
 * o `loading`: sem ele, o app pisca a tela de login antes de ler o Keychain.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  setAuthenticated: (user) => set({ status: 'authenticated', user }),
  setAnonymous: () => set({ status: 'anonymous', user: null }),
}))
