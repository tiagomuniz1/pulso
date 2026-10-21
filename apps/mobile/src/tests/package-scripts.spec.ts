import appConfig from '../../app.config'
import packageJson from '../../package.json'

/**
 * Os comandos de desenvolvimento, travados por teste.
 *
 * `npx expo prebuild` e `npx expo install --fix` **reescrevem** `android` e
 * `ios` para `expo run:*` sem avisar — aconteceu duas vezes só nesta semana.
 * A diferença não é de estilo: `expo start` abre o Metro e serve o app para o
 * Expo Go do aparelho, que é como o app é rodado aqui; `expo run:*` compila
 * nativamente e exige Xcode ou o SDK do Android instalado. Quem der
 * `yarn ios` depois de um prebuild descobre isso no meio de uma compilação
 * que não pediu.
 */
describe('scripts do package.json', () => {
  it.each([
    ['android', 'expo start --android'],
    ['ios', 'expo start --ios'],
  ])('`%s` serve o app pelo Metro, não compila nativo', (name, command) => {
    expect((packageJson.scripts as Record<string, string>)[name]).toBe(command)
  })

  // A versão aqui e a do `app.config.ts` são a mesma coisa dita duas vezes, e
  // a regra da casa é que elas não divirjam.
  it('a versão bate com a do app.config', () => {
    expect(appConfig.version).toBe(packageJson.version)
  })
})
