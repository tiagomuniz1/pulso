import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { APPOINTMENT_LABEL_COLOR_HEX, AppointmentLabelColor } from '@app/shared'

/**
 * A paleta de rótulos existe em dois lugares: nas variáveis CSS, de onde saem
 * as classes do Tailwind, e no `@app/shared`, de onde o app mobile a lê.
 *
 * Não dá para eliminar a duplicação sem reescrever a geração do CSS, mas dá
 * para fazer a divergência falhar aqui em vez de aparecer na tela: o mesmo
 * rótulo com uma cor no site e outra no celular derruba justamente o que ele
 * existe para fazer, que é ser reconhecido de relance.
 */
function parseBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const end = css.indexOf('{', css.indexOf('{', start) + 1)
  const block = css.slice(start, end === -1 ? undefined : end)
  const out: Record<string, string> = {}
  for (const match of block.matchAll(/--label-([a-z]+)(-soft)?:\s*(#[0-9A-Fa-f]{6});/g)) {
    out[`${match[1]}${match[2] ?? ''}`] = match[3].toUpperCase()
  }
  return out
}

describe('paleta de rótulos', () => {
  const css = readFileSync(join(__dirname, 'globals.css'), 'utf8')
  const light = parseBlock(css, ':root {')
  const dark = parseBlock(css, '.dark {')
  const colors = Object.values(AppointmentLabelColor)

  it.each(colors)('%s tem o mesmo hexadecimal no CSS e no shared', (color) => {
    const shared = APPOINTMENT_LABEL_COLOR_HEX[color]

    expect(light[color]).toBe(shared.light.base.toUpperCase())
    expect(light[`${color}-soft`]).toBe(shared.light.soft.toUpperCase())
    expect(dark[color]).toBe(shared.dark.base.toUpperCase())
    expect(dark[`${color}-soft`]).toBe(shared.dark.soft.toUpperCase())
  })

  it('o shared cobre as dezesseis cores, sem sobra nem falta', () => {
    expect(Object.keys(APPOINTMENT_LABEL_COLOR_HEX).sort()).toEqual([...colors].sort())
    expect(colors).toHaveLength(16)
  })
})
