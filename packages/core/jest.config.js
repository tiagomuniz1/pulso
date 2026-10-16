/**
 * `ts-jest` e não babel: o pacote é TypeScript puro, sem JSX e sem runtime de
 * framework — compilar com o mesmo compilador que o build usa evita que um
 * teste passe sobre código que o `tsc` recusaria.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Sem isto, depois de um `build` o jest acha os specs compilados em `dist`
  // e roda cada suíte duas vezes — a segunda contra um JavaScript que já não
  // é o código-fonte que se quer provar.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    // `dist`, como o frontend faz: o `shared` usa decorators do
    // `class-validator`, que o tsconfig do core não habilita — compilar o
    // código-fonte dele aqui quebraria em cada DTO.
    '^@app/shared$': '<rootDir>/../shared/dist',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/index.ts'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
}
