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
    // apontar para `dist` obrigaria a reconstruir o core antes de cada rodada.
    '^@app/core$': '<rootDir>/../../packages/core/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/tests/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  // A régua da casa, verificada pela máquina: um ramo novo sem teste falha o
  // comando, em vez de aparecer num relatório que ninguém lê.
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
}
