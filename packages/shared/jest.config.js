/**
 * O `shared` passou a ter código executável, e não só tipos.
 *
 * Ele nasceu como pacote de DTOs, enums e configs — nada a testar. Quando
 * `formatCpf`, `formatPhone` e as regras de situação de consulta vieram para
 * cá, os specs vieram junto e **deixaram de rodar**: nenhum workspace os
 * alcançava, porque o frontend mapeia `@app/shared` para `dist` e tem as
 * próprias raízes. Quatro suítes verdes no commit anterior eram quatro
 * suítes que ninguém executava.
 *
 * `ts-jest` como no core: o pacote é TypeScript puro, e compilar com o mesmo
 * compilador do build evita um teste passar sobre código que o `tsc` recusa.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Sem isto, depois de um `build` o jest acha os specs compilados em `dist`
  // e roda cada suíte duas vezes.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    // Tudo que tem comportamento, e nada além. DTOs, enums e types são
    // contrato — quem os verifica é o compilador —, e `config/` é, fora
    // dois arquivos, tabela de consulta sem ramo nenhum: os valores delas
    // são guardados por quem os consome (ver
    // `apps/frontend/app/globals-label-palette.spec.ts`).
    'src/utils/**/*.ts',
    '!src/utils/index.ts',
    'src/config/appointment-status.config.ts',
    'src/config/recurrence-status.config.ts',
  ],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
}
