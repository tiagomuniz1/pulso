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

/**
 * `AsyncStorage` também é módulo nativo. A biblioteca publica o próprio mock,
 * que é preferível a um escrito à mão: ele acompanha a API quando ela muda, e
 * qualquer tela que renderize o tema passa por aqui.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

/**
 * `expo-image-picker` é módulo nativo e, sem mock, deixa um handle aberto que
 * impede o jest de encerrar — o run passa e depois pendura. Cada spec que
 * precisa de um resultado específico sobrescreve o retorno.
 */
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}))

/**
 * `expo-document-picker` é módulo nativo e segue o mesmo caminho do
 * `expo-image-picker`: sem mock o import quebra a suíte inteira que toca na
 * seção de exames. Cada spec que precisa de um resultado específico
 * sobrescreve o retorno.
 */
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}))
