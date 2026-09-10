import { Injectable } from '@nestjs/common'
import { VaccineIndicationSnapshot } from '@app/shared'
import { buildClinicHeader } from '../../../common/pdf/clinic-header.builder'
import { formatCpf } from '../../../common/pdf/format-cpf.util'
import {
  buildContinuationHeader,
  buildPageNumberFooter,
} from '../../../common/pdf/page-furniture.builder'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES } from '../../../common/pdf/pdf-styles'
import { buildSignatureFooter } from '../../../common/pdf/signature-footer.builder'

@Injectable()
export class VaccineIndicationPdfBuilderService {
  constructor(private readonly pdfDocumentService: PdfDocumentService) {}

  async build(snapshot: VaccineIndicationSnapshot, logoBase64: string | null): Promise<Buffer> {
    return this.pdfDocumentService.render(this.buildDocDefinition(snapshot, logoBase64))
  }

  private buildDocDefinition(snapshot: VaccineIndicationSnapshot, logoBase64: string | null) {
    const content: object[] = []

    content.push(...buildClinicHeader(snapshot.clinic, logoBase64))
    content.push({
      text: 'Indicação de vacina',
      style: 'title',
      alignment: 'center',
      margin: [0, 20, 0, 16],
    })
    content.push(...this.buildPatient(snapshot))
    content.push(...this.buildItems(snapshot))
    if (snapshot.notes) content.push(...this.buildNotes(snapshot.notes))
    content.push(...buildSignatureFooter(snapshot))

    return {
      content,
      header: buildContinuationHeader(snapshot.clinic),
      footer: buildPageNumberFooter(),
      defaultStyle: PDF_DEFAULT_STYLE,
      // A indicação lista vacinas com destaque próprio — é o único documento
      // com um estilo além dos comuns.
      styles: { ...PDF_STYLES, itemName: { fontSize: 11, bold: true } },
      pageMargins: PDF_PAGE_MARGINS,
    }
  }

  private buildPatient(snapshot: VaccineIndicationSnapshot): object[] {
    return [
      {
        text: [
          { text: 'Paciente: ', bold: true },
          { text: snapshot.patient.name },
          { text: `  ·  CPF ${formatCpf(snapshot.patient.documentNumber)}`, fontSize: 9 },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        text: 'Indico as vacinas abaixo, a serem aplicadas em serviço de imunização:',
        margin: [0, 0, 0, 4],
      },
    ]
  }

  private buildItems(snapshot: VaccineIndicationSnapshot): object[] {
    const blocks: object[] = []

    snapshot.items.forEach((item, index) => {
      const title = item.abbreviation ? `${item.name} (${item.abbreviation})` : item.name
      blocks.push({ text: `${index + 1}. ${title}`, style: 'itemName', margin: [0, 10, 0, 0] })
      if (item.doseLabel) {
        blocks.push({ text: item.doseLabel, fontSize: 9, margin: [12, 2, 0, 0] })
      }
      if (item.instructions) {
        blocks.push({ text: item.instructions, margin: [12, 2, 0, 0] })
      }
    })

    return blocks
  }

  private buildNotes(notes: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: notes, margin: [0, 0, 0, 8] },
    ]
  }
}
