/**
 * `expo-secure-store` é um módulo nativo: no Jest ele não existe, e sem mock
 * qualquer teste que toque na sessão quebra no import. O mock guarda em memória,
 * o que também torna o comportamento verificável — os testes conseguem afirmar
 * o que foi gravado, não só que a chamada aconteceu.
 */
jest.mock('expo-secure-store', () => {
  const store = new Map()
  return {
    __store: store,
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value)
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key)
    }),
  }
})

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiUrl: 'http://api.test' } } },
}))
