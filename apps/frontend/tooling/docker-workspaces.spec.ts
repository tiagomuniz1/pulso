import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

/**
 * Todo workspace precisa aparecer em todo Dockerfile que roda `yarn install`.
 *
 * Os Dockerfiles copiam os `package.json` um a um, de propósito: é o que faz o
 * cache de camada sobreviver a uma mudança de código. O preço é que **criar um
 * workspace quebra o build de produção** — o `--immutable` recusa um lockfile
 * cujo workspace não está presente e o yarn vai procurar o pacote no registro
 * público, onde ele não existe.
 *
 * Aconteceu: `packages/core` e `apps/mobile` entraram no monorepo e os três
 * Dockerfiles passaram a falhar. Só apareceu porque alguém tentou subir a
 * stack local — a suíte inteira estava verde.
 */
function workspaceDirs(): string[] {
  return ['apps', 'packages', 'tools'].flatMap((group) =>
    readdirSync(join(ROOT, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${group}/${entry.name}`)
      .filter((dir) => existsSync(join(ROOT, dir, 'package.json'))),
  )
}

const DOCKERFILES = ['apps/backend/Dockerfile', 'apps/frontend/Dockerfile', 'apps/website/Dockerfile']

describe('Dockerfiles e os workspaces do monorepo', () => {
  const dirs = workspaceDirs()

  it('o monorepo tem os workspaces que esperamos', () => {
    expect(dirs).toEqual(expect.arrayContaining(['apps/backend', 'apps/frontend', 'packages/shared']))
  })

  describe.each(DOCKERFILES)('%s', (dockerfile) => {
    const content = readFileSync(join(ROOT, dockerfile), 'utf8')
    const installStages = content.split('\n').filter((line) => line.includes('yarn install')).length

    it('roda ao menos um `yarn install`', () => {
      expect(installStages).toBeGreaterThan(0)
    })

    it.each(workspaceDirs())('copia o package.json de %s', (dir) => {
      expect(content).toContain(`COPY ${dir}/package.json ./${dir}/`)
    })
  })
})
