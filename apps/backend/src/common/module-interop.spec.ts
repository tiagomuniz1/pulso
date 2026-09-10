import sharp from 'sharp'

/**
 * Trava de configuração, não de código.
 *
 * O `tsconfig` deste app já teve `allowSyntheticDefaultImports: true` **sem**
 * `esModuleInterop`. É a combinação mais traiçoeira possível: a primeira faz a
 * checagem de tipos aceitar `import x from 'pacote-cjs'`, a segunda é quem
 * emite o helper que faz isso funcionar em tempo de execução. Com uma e sem a
 * outra, o código compila limpo e quebra ao rodar.
 *
 * Custou caro: o logo da clínica sumiu de **todos** os PDFs da plataforma —
 * receita, atestado, pedido de exame, indicação de vacina — e ninguém percebeu,
 * porque o erro caía num `catch` que descartava o motivo. O diagnóstico exigiu
 * abrir o container de produção.
 *
 * Este teste falha se alguém desligar o `esModuleInterop`. O `sharp` é o
 * sujeito certo porque é CommonJS **sem** `default` próprio: sem o helper,
 * `sharp` aqui seria `undefined`.
 */
describe('interoperabilidade de módulos CommonJS', () => {
  it('resolve o import default de um pacote CommonJS sem default próprio', () => {
    expect(typeof sharp).toBe('function')
  })

  // O que o helper faz é embrulhar; o módulo cru continua sem `default`. Se
  // este teste passar a falhar, foi o `sharp` que mudou de formato — e aí o de
  // cima passaria mesmo sem interop, deixando de vigiar o que deveria.
  it('confirma que o pacote cru não tem default — é isso que o helper supre', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cru = require('sharp')
    expect(typeof cru).toBe('function')
    expect(cru.default).toBeUndefined()
  })
})
