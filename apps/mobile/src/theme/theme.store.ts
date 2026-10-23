import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ColorMode = 'light' | 'dark'

export interface IThemeState {
  mode: ColorMode
  /** Falso até a preferência gravada ser lida — ver `ThemeProvider`. */
  hydrated: boolean
  toggleMode: () => void
  setMode: (mode: ColorMode) => void
}

/**
 * Semente do aparelho, decisão do usuário depois.
 *
 * Mesmo contrato da web (`stores/theme.store.ts`): o sistema dá o primeiro
 * valor e, a partir do primeiro toque, vale o que a pessoa escolheu. Seguir o
 * sistema para sempre tiraria dela a escolha — e no Expo Go seria pior ainda,
 * porque ali o app herda a aparência do Expo Go, não a do iOS.
 */
export function systemColorMode(): ColorMode {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

/**
 * O que fazer quando a preferência gravada chega.
 *
 * Sem o `??`, um registro antigo — gravado por uma versão que guardava outra
 * forma — deixaria o app sem modo nenhum e com a tela entre os dois temas. A
 * semente do aparelho é o fundo do poço.
 *
 * Função nomeada e exportada para ser testável: dentro do `persist` ela só
 * roda quando o middleware decide, e nunca com o estado quebrado.
 */
export function rehydrateMode(state?: IThemeState): void {
  state?.setMode(state.mode ?? systemColorMode())
}

/**
 * `AsyncStorage` e não `expo-secure-store`: preferência de tema não é segredo,
 * e o Keychain cobra uma ida ao enclave segura a cada leitura. O segredo deste
 * app é o par de tokens, e esse continua lá.
 */
export const useThemeStore = create<IThemeState>()(
  persist(
    (set) => ({
      mode: systemColorMode(),
      hydrated: false,
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => rehydrateMode,
    },
  ),
)
