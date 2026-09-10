// O pdfmake é mockado para capturar as políticas de acesso registradas no
// `onModuleInit` e invocá-las, sem depender de o pdfmake chamá-las por dentro.
//
// Este spec substitui quatro `*-pdf-builder.init.spec.ts` idênticos, um por
// documento — eram quatro porque o registro de fontes estava copiado quatro
// vezes. Com a base comum há um lugar só, e um teste só.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(() => ({ getBuffer: jest.fn(async () => Buffer.from('%PDF-fake')) })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { PdfDocumentService } from './pdf-document.service'

describe('PdfDocumentService', () => {
  let service: PdfDocumentService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PdfDocumentService()
    service.onModuleInit()
  })

  it('registers a URL access policy that always returns false (blocks external URLs)', () => {
    const urlPolicy: () => boolean = (pdfmake.setUrlAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(urlPolicy()).toBe(false)
  })

  it('registers a local access policy that always returns true (allows font files)', () => {
    const localPolicy: () => boolean = (pdfmake.setLocalAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(localPolicy()).toBe(true)
  })

  it('registers the four Roboto variants', () => {
    const fonts = (pdfmake.addFonts as jest.Mock).mock.calls[0][0]
    expect(Object.keys(fonts.Roboto).sort()).toEqual(['bold', 'bolditalics', 'italics', 'normal'])
  })

  // O pdfmake 0.3 é singleton de módulo: registrar de novo sobrescreveria a
  // configuração do processo inteiro. A guarda existe para o caso de o Nest
  // instanciar este provider mais de uma vez.
  it('does not register the fonts twice', () => {
    service.onModuleInit()
    expect(pdfmake.addFonts).toHaveBeenCalledTimes(1)
  })

  it('renders the document definition through pdfmake', async () => {
    const definition = { content: [{ text: 'olá' }] }

    const buffer = await service.render(definition)

    expect(pdfmake.createPdf).toHaveBeenCalledWith(definition)
    expect(buffer.toString()).toBe('%PDF-fake')
  })
})
