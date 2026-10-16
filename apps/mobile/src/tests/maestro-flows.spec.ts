import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MAESTRO_DIR = join(__dirname, '..', '..', 'maestro')
const SOURCE_DIR = join(__dirname, '..')

/**
 * Todo `testID` citado por um fluxo Maestro precisa existir no código.
 *
 * Os fluxos não rodam aqui: Maestro exige simulador ou aparelho com o app
 * instalado, e nenhum CI nosso tem isso hoje. O resultado é que eles
 * apodrecem em silêncio — quando a agenda virou grade de horários e o
 * prontuário virou aba, **oito dos vinte e dois** identificadores deixaram
 * de existir e nada reclamou.
 *
 * Isto não substitui rodar. É o que a máquina consegue afirmar sem um
 * aparelho: que o fluxo fala dos elementos que a tela de hoje tem.
 */
function flowFiles(): string[] {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      return entry.name.endsWith('.yaml') ? [full] : []
    })
  }
  return walk(MAESTRO_DIR)
}

function sourceFiles(): string[] {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [full] : []
    })
  }
  return walk(SOURCE_DIR)
}

const SOURCE = sourceFiles()
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

/**
 * Um id de fluxo pode ser uma expressão regular — `agenda-slot-booked-.*`
 * casa com a linha de qualquer consulta. O que se verifica então é o
 * prefixo literal, que é a parte que o código precisa produzir.
 */
function literalPrefix(flowId: string): string {
  return flowId.replace(/\.\*.*$/, '')
}

/**
 * O id existe no código, literal ou interpolado.
 *
 * `drawer-item-appointments` não aparece escrito em lugar nenhum: a lista
 * monta `testID={`drawer-item-${item.id}`}`. Então se o literal não casa,
 * tira-se **um** segmento e exige-se a interpolação exatamente ali. Um
 * segmento só, e com o `${` colado: aceitar qualquer prefixo faria
 * `agenda-hoje` passar por causa de `agenda-slot-booked-${…}`.
 */
function isExposed(prefix: string): boolean {
  const trimmed = prefix.replace(/-$/, '')
  if (SOURCE.includes(`testID="${trimmed}"`)) return true
  // `agenda-slot-booked-.*` chega aqui já como o próprio pai.
  if (SOURCE.includes(`testID={\`${trimmed}-\${`)) return true

  const parent = trimmed.slice(0, trimmed.lastIndexOf('-'))
  return parent.length > 0 && SOURCE.includes(`testID={\`${parent}-\${`)
}

function referencedIds(): { file: string; id: string }[] {
  return flowFiles().flatMap((file) => {
    const matches = readFileSync(file, 'utf8').matchAll(/id:\s*"([^"]+)"/g)
    return [...matches].map((match) => ({ file: file.replace(`${MAESTRO_DIR}/`, ''), id: match[1] }))
  })
}

describe('fluxos Maestro e os testID do app', () => {
  const ids = referencedIds()

  it('os fluxos citam algum identificador', () => {
    expect(ids.length).toBeGreaterThan(10)
  })

  it.each([...new Set(ids.map(({ id }) => id))])('o app expõe %s', (id) => {
    expect(isExposed(literalPrefix(id))).toBe(true)
  })
})
