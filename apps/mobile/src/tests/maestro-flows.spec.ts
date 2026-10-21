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
 * Três formas, e as três são necessárias:
 *
 * 1. **literal** — `testID="agenda-screen"` no JSX, ou `testID: 'x'` em quem
 *    recebe o id por propriedade;
 * 2. **montado na origem** — `testID={`drawer-item-${item.id}`}`: o prefixo
 *    é fixo e o resto vem do dado;
 * 3. **montado por quem recebe** — o `ChoiceField` nomeia cada pastilha com
 *    `${testID}-${option.value}`, e o prefixo literal está em quem o chama.
 *
 * A terceira é a que exige cuidado. Aceitar "qualquer sufixo sobre um id
 * que existe" não guarda nada: `patient-list-busca` passaria por causa de
 * `patient-list`. Então o que se confere é **o componente que recebeu
 * aquele id** e quais sufixos ele sabe produzir — os fixos por nome, e os
 * dinâmicos como curinga, que é tudo que dá para afirmar sem desenhar a
 * tela.
 */
function isExposed(prefix: string): boolean {
  const trimmed = prefix.replace(/-$/, '')
  if (isLiteral(trimmed) || interpolates(trimmed)) return true

  const segments = trimmed.split('-')
  for (let cut = segments.length - 1; cut > 0; cut -= 1) {
    const parent = segments.slice(0, cut).join('-')
    const suffix = segments.slice(cut).join('-')
    // O prefixo literal mais longo decide. Cair para um mais curto que
    // interpola — `prescription-template-${id}` sob
    // `prescription-template-items-dosage-0` — aceitaria qualquer sufixo e
    // esvaziaria o teste.
    if (isLiteral(parent)) return acceptsSuffix(parent, suffix)
    if (interpolates(parent)) return true
  }
  return false
}

/**
 * Escrito como `testID="x"` no JSX — ou como `testID: 'x'`, que é a forma
 * de quem recebe o id por propriedade, como o botão do cabeçalho de
 * listagem.
 */
function isLiteral(id: string): boolean {
  return SOURCE.includes(`testID="${id}"`) || SOURCE.includes(`testID: '${id}'`)
}

/**
 * O id é montado, e não escrito: `testID={\`x-${id}\`}` no JSX, ou numa
 * variável antes dele — é como o campo dinâmico do prontuário nomeia cada
 * linha do schema. Só o prefixo literal pode ser verificado.
 */
function interpolates(prefix: string): boolean {
  return SOURCE.includes(`testID={\`${prefix}-\${`) || SOURCE.includes(`= \`${prefix}-\${`)
}

/** O componente que recebeu aquele id literal — o `<X` mais próximo antes. */
function ownerOf(id: string): string | null {
  const index = SOURCE.indexOf(`testID="${id}"`)
  if (index === -1) return null
  const opened = [...SOURCE.slice(0, index).matchAll(/<([A-Z]\w*)/g)].pop()
  return opened ? opened[1] : null
}

/** O corpo da função de um componente, para ler o que ele nomeia. */
function bodyOf(component: string): string | null {
  const definition = SOURCE.match(new RegExp(`function ${component}\\(([\\s\\S]*?)\\n}\\n`))
  return definition ? definition[1] : null
}

/** Quem recebe `${testID}-<sufixo>` dentro de um corpo — o `<X` mais próximo antes. */
function receiverOf(body: string, suffix: string): string | null {
  const index = body.indexOf('testID={`${testID}-' + suffix + '`}')
  if (index === -1) return null
  const opened = [...body.slice(0, index).matchAll(/<([A-Z]\w*)/g)].pop()
  return opened ? opened[1] : null
}

/**
 * Aquele corpo sabe produzir aquele sufixo a partir do próprio `testID`?
 *
 * Quatro formas, e a última é o motivo de isto ser recursivo:
 *
 * 1. **inteiramente dinâmico** (`${testID}-${option.value}`) — qualquer
 *    sufixo é possível e não há o que afirmar;
 * 2. **fixo** (`${testID}-search`);
 * 3. **fixo com cauda dinâmica** (`${testID}-item-${index}`) — só o começo
 *    pode ser afirmado;
 * 4. **repassado** — o editor nomeia uma pastilha de `${testID}-mode` e
 *    quem a recebe acrescenta `-digitar`. Sem descer até lá, o fluxo que
 *    toca a pastilha não teria como ser verificado.
 */
function bodyProduces(body: string, suffix: string): boolean {
  if (/testID=\{`\$\{testID\}-\$\{/.test(body)) return true

  const fixed = [...body.matchAll(/testID=\{`\$\{testID\}-([\w-]+)`\}/g)].map((m) => m[1])
  if (fixed.includes(suffix)) return true

  const open = [...body.matchAll(/testID=\{`\$\{testID\}-([\w-]+)-\$\{/g)].map((m) => m[1])
  if (open.some((start) => suffix.startsWith(`${start}-`))) return true

  return fixed.some((start) => {
    if (!suffix.startsWith(`${start}-`)) return false
    const receiver = receiverOf(body, start)
    const inner = receiver ? bodyOf(receiver) : null
    return inner ? bodyProduces(inner, suffix.slice(start.length + 1)) : false
  })
}

function acceptsSuffix(parent: string, suffix: string): boolean {
  const owner = ownerOf(parent)
  const body = owner ? bodyOf(owner) : null
  return body ? bodyProduces(body, suffix) : false
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
