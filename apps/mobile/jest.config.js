/**
 * `jest-expo` traz o preset que entende o runtime do React Native — transformar
 * os módulos ESM de `node_modules`, mockar os módulos nativos e resolver as
 * extensões por plataforma. Jest puro não roda este app.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Código-fonte, não o build: o babel do preset já transpila TypeScript, e
    // apontar para `dist` obrigaria a reconstruir o pacote antes de cada
    // rodada. Com o `shared` fora daqui o sintoma era pior do que um erro de
    // compilação: a função nova existia no fonte, o teste a importava do
    // `dist` antigo e o erro era "is not a function", longe da causa.
    '^@app/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@app/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/tests/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  // A régua da casa, verificada pela máquina: um ramo novo sem teste falha o
  // comando, em vez de aparecer num relatório que ninguém lê.
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
  /**
   * Sem isto o comando não termina.
   *
   * Qualquer spec que **renderize** deixa um handle aberto que o próprio
   * `--detectOpenHandles` não consegue atribuir — vem do runtime que o
   * `jest-expo` monta, não do código do app: um spec puro, como o do tema,
   * sai sozinho. Na prática `yarn workspace @app/mobile test` ficava
   * pendurado depois de imprimir o resultado, e numa rodada que falha ficava
   * pendurado para sempre, o que esconde o próprio erro que se foi procurar.
   *
   * Os testes já terminaram quando isto age, e a cobertura já foi escrita.
   */
  forceExit: true,
}
