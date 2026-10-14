import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'
import { rehydrateMode, systemColorMode, useThemeStore } from './theme.store'

describe('theme.store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useThemeStore.setState({ mode: 'light' })
  })

  it('alterna entre claro e escuro', () => {
    useThemeStore.getState().toggleMode()
    expect(useThemeStore.getState().mode).toBe('dark')

    useThemeStore.getState().toggleMode()
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('aceita um modo direto', () => {
    useThemeStore.getState().setMode('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
  })

  // Preferência de tema não é segredo, e o Keychain cobra uma ida ao enclave
  // a cada leitura. O que é segredo neste app é o par de tokens.
  it('guarda a escolha no armazenamento comum, não no seguro', async () => {
    useThemeStore.getState().setMode('dark')

    await new Promise<void>((resolve) => setImmediate(() => resolve()))

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'theme-preference',
      expect.stringContaining('dark'),
    )
  })

  describe('systemColorMode', () => {
    // O sistema dá a semente; a partir do primeiro toque vale a escolha.
    it.each([
      ['dark', 'dark'],
      ['light', 'light'],
      [null, 'light'],
      [undefined, 'light'],
    ])('aparelho em %s vira %s', (scheme, expected) => {
      jest
        .spyOn(Appearance, 'getColorScheme')
        .mockReturnValue(scheme as ReturnType<typeof Appearance.getColorScheme>)

      expect(systemColorMode()).toBe(expected)
    })
  })

  describe('rehydrateMode', () => {
    it.each([
      ['dark' as const, 'dark'],
      ['light' as const, 'light'],
    ])('respeita a preferência gravada (%s)', (stored, expected) => {
      useThemeStore.setState({ mode: stored })

      rehydrateMode(useThemeStore.getState())

      expect(useThemeStore.getState().mode).toBe(expected)
    })

    // Registro corrompido ou de uma versão antiga não pode deixar o app sem
    // modo: a tela ficaria entre os dois temas.
    it('cai no aparelho quando o gravado não tem modo', () => {
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark')
      useThemeStore.setState({ mode: undefined as unknown as 'light' })

      rehydrateMode(useThemeStore.getState())

      expect(useThemeStore.getState().mode).toBe('dark')
    })

    // O middleware chama sem estado quando a leitura falha.
    it('não quebra quando não chega estado nenhum', () => {
      expect(() => rehydrateMode(undefined)).not.toThrow()
    })
  })
})
