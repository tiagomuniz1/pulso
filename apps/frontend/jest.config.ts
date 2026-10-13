import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFiles: ['reflect-metadata'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@app/shared$': '<rootDir>/../../packages/shared/dist',
    // `src` e não `dist`: o core é TypeScript que o transform do Next já
    // compila, e apontar para o build obrigaria a reconstruir o pacote antes
    // de cada rodada de teste do frontend.
    '^@app/core$': '<rootDir>/../../packages/core/src/index.ts',
    // Subcaminho só para `jest.mock`: trocar um export do barril não
    // intercepta quem o importa *de dentro* do pacote — um use-case real
    // continuaria falando com o service real. Substituir o módulo interno é
    // o que preserva a semântica que estes specs sempre tiveram.
    '^@app/core/(.*)$': '<rootDir>/../../packages/core/$1',
    '^@app/shared/(.*)$': '<rootDir>/../../packages/shared/dist/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!components/**/types/**',
  ],
}

export default createJestConfig(config)
