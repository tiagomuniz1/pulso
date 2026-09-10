import { Injectable } from '@nestjs/common'
import { ExamRequestSnapshot } from '@app/shared'
import { buildClinicHeader } from '../../../common/pdf/clinic-header.builder'
import { formatCpf } from '../../../common/pdf/format-cpf.util'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES } from '../../../common/pdf/pdf-styles'
import { buildSignatureFooter } from '../../../common/pdf/signature-footer.builder'

@Injectable()
export class ExamRequestPdfBuilderService {
  constructor(private readonly pdfDocumentService: PdfDocumentService) {}

  async build(snapshot: ExamRequestSnapshot, logoBase64: string | null): Promise<Buffer> {
    return this.pdfDocumentService.render(this.buildDocDefinition(snapshot, logoBase64))
  }

  private buildDocDefinition(snapshot: ExamRequestSnapshot, logoBase64: string | null) {
    const content: object[] = []

    content.push(...buildClinicHeader(snapshot.clinic, logoBase64))
    content.push({
      text: 'SOLICITAÇÃO DE EXAMES',
      style: 'title',
      alignment: 'center',
      margin: [0, 20, 0, 16],
    })
    content.push(...this.buildPatientBlock(snapshot))
    content.push(...this.buildItems(snapshot))
    if (snapshot.notes) content.push(...this.buildNotes(snapshot.notes))
    content.push(...buildSignatureFooter(snapshot))

    return {
      content,
      defaultStyle: PDF_DEFAULT_STYLE,
      styles: PDF_STYLES,
      pageMargins: PDF_PAGE_MARGINS,
    }
  }

  private buildPatientBlock(snapshot: ExamRequestSnapshot): object[] {
    return [
      { text: 'Paciente', style: 'sectionLabel' },
      { text: snapshot.patient.name },
      { text: `CPF: ${formatCpf(snapshot.patient.documentNumber)}`, margin: [0, 0, 0, 8] },
    ]
  }

  private buildItems(snapshot: ExamRequestSnapshot): object[] {
    if (snapshot.items.length === 0) return []

    const header: object = { text: 'Exames Solicitados', style: 'sectionLabel' }
    const items = snapshot.items.map((item, index) => ({
      margin: [0, 0, 0, 8],
      stack: [
        { text: `${index + 1}. ${item.name}`, bold: true },
        ...(item.observations ? [{ text: item.observations, margin: [12, 2, 0, 0] }] : []),
      ],
    }))

    return [header, ...items]
  }

  private buildNotes(notes: string): object[] {
    return [
      { text: 'Observações gerais', style: 'sectionLabel' },
      { text: notes, margin: [0, 0, 0, 8] },
    ]
  }
}
