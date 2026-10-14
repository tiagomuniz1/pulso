import { create } from 'zustand'

interface NavigationState {
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

/**
 * Se o menu está aberto. Espelha o `sidebar.store` da web, que existe pelo
 * mesmo motivo: o botão que abre e o painel que fecha vivem em componentes
 * distantes um do outro na árvore.
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
}))
