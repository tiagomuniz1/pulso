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
    // Só onde há comportamento. DTOs, enums e types são contrato — quem os
    // verifica é o compilador —, e `config/` é, fora um arquivo, tabela de
    // consulta sem ramo nenhum.
    'src/utils/**/*.ts',
    '!src/utils/index.ts',
    'src/config/appointment-status.config.ts',
    'src/config/recurrence-status.config.ts',
    // Estes três vivem aqui mas são provados por quem os consome, e o teste
    // está lá porque é lá que o significado deles aparece:
    //   clinic-theme          → apps/frontend/hooks/use-apply-clinic-theme.hook.spec.ts
    //   get-primary-council-type → apps/backend/.../professionals/utils/*.spec.ts
    //   format-date           → usado só na formatação do dashboard
    // Trazê-los para cá é trabalho à parte, e está anotado.
    '!src/utils/clinic-theme.util.ts',
    '!src/utils/get-primary-council-type.util.ts',
    '!src/utils/format-date.util.ts',
  ],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
}
