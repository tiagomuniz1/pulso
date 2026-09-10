import { buildContinuationHeader, buildPageNumberFooter } from './page-furniture.builder'
import { PdfClinic } from './pdf-document.types'

const clinic: PdfClinic = { name: 'Clínica Pulso', address: null }

describe('buildContinuationHeader', () => {
  // A primeira página já traz o cabeçalho completo, com logo e endereço.
  // Repetir a identificação ali seria dizer duas vezes a mesma coisa.
  it('does not render on the first page', () => {
    expect(buildContinuationHeader(clinic)(1)).toBeUndefined()
  })

  it('names the clinic on continuation pages', () => {
    expect(buildContinuationHeader(clinic)(2)).toMatchObject({ text: 'Clínica Pulso' })
    expect(buildContinuationHeader(clinic)(7)).toMatchObject({ text: 'Clínica Pulso' })
  })

  // Fica dentro da margem superior de 50pt, acima de onde o conteúdo começa.
  it('sits inside the top margin so it never collides with the content', () => {
    const header = buildContinuationHeader(clinic)(2) as { margin: number[] }
    const [, top] = header.margin
    expect(top).toBeLessThan(50)
  })
})

describe('buildPageNumberFooter', () => {
  // "1 de 1" é ruído, e é o que todo documento emitido é hoje. Esta é a
  // condição que mantém receita, atestado, pedido de exame e indicação de
  // vacina saindo exatamente como saíam.
  it('does not render when the document fits in one page', () => {
    expect(buildPageNumberFooter()(1, 1)).toBeUndefined()
  })

  it('numbers each page against the total when there is more than one', () => {
    expect(buildPageNumberFooter()(1, 3)).toMatchObject({ text: '1 de 3' })
    expect(buildPageNumberFooter()(3, 3)).toMatchObject({ text: '3 de 3' })
  })
})
