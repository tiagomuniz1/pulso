import { Injectable, OnModuleInit } from '@nestjs/common'
import * as path from 'path'

// pdfmake 0.3.x server-side singleton — configured once at module init
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')

/**
 * O ponto único de contato com o pdfmake.
 *
 * O pdfmake 0.3 é um singleton de módulo: `addFonts` e as políticas de acesso
 * valem para o processo inteiro. Antes cada um dos quatro builders registrava
 * as fontes no próprio `onModuleInit`, sobre a mesma instância global — quatro
 * registros idênticos e um contrato implícito de que todos concordassem. Agora
 * é um só, e a guarda de idempotência garante que continue sendo um mesmo que
 * o Nest instancie este provider mais de uma vez.
 */
@Injectable()
export class PdfDocumentService implements OnModuleInit {
  private fontsRegistered = false

  onModuleInit() {
    if (this.fontsRegistered) return

    const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'))
    const fontDir = path.join(pdfmakeDir, 'build', 'fonts', 'Roboto')

    pdfmake.addFonts({
      Roboto: {
        normal: path.join(fontDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
      },
    })

    // Ler os `.ttf` do disco, sim; buscar qualquer URL, não. É o que obriga o
    // logo a chegar já embutido como data-URI, e o que impede um documento de
    // virar vetor de requisição para fora a partir de um dado do banco.
    pdfmake.setLocalAccessPolicy(() => true)
    pdfmake.setUrlAccessPolicy(() => false)

    this.fontsRegistered = true
  }

  async render(docDefinition: object): Promise<Buffer> {
    return pdfmake.createPdf(docDefinition).getBuffer()
  }
}
