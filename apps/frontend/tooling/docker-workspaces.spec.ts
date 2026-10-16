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

/**
 * Os apps cujo binário de build **não** hoista para a raiz.
 *
 * `next` fica aninhado em cada app porque o `apps/mobile` fixa React 19 e os
 * dois apps Next fixam React 18 — o yarn não consegue uma cópia só que sirva
 * aos dois mundos. Copiar apenas `/app/node_modules` deixa o builder sem o
 * `next`, e o build morre em `Cannot find module .../next/dist/bin/next`.
 *
 * Aconteceu, e ficou duas semanas sem aparecer: a imagem em uso era anterior
 * ao app, e ninguém tinha reconstruído.
 */
const NESTED_MODULES = ['apps/frontend', 'apps/website']

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

  describe.each(NESTED_MODULES)('%s — node_modules aninhado', (app) => {
    const content = readFileSync(join(ROOT, app, 'Dockerfile'), 'utf8')

    it('tem mesmo o `next` aninhado, e não na raiz', () => {
      expect(existsSync(join(ROOT, app, 'node_modules', 'next'))).toBe(true)
      expect(existsSync(join(ROOT, 'node_modules', 'next'))).toBe(false)
    })

    it('copia o node_modules do próprio app para o builder', () => {
      expect(content).toContain(
        `COPY --from=deps /app/${app}/node_modules ./${app}/node_modules`,
      )
    })
  })
})
