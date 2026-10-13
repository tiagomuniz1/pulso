/**
 * `jest-expo` traz o preset que entende o runtime do React Native — transformar
 * os módulos ESM de `node_modules`, mockar os módulos nativos e resolver as
 * extensões por plataforma. Jest puro não roda este app.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
}
