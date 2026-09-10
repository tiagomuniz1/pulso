import { Injectable } from '@nestjs/common'
import { PrescriptionSnapshot } from '@app/shared'
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
export class PrescriptionPdfBuilderService {
  constructor(private readonly pdfDocumentService: PdfDocumentService) {}

  async build(
    snapshot: PrescriptionSnapshot,
    logoBase64: string | null,
    verificationUrl: string,
  ): Promise<Buffer> {
    return this.pdfDocumentService.render(
      this.buildDocDefinition(snapshot, logoBase64, verificationUrl),
    )
  }

  private buildDocDefinition(
    snapshot: PrescriptionSnapshot,
    logoBase64: string | null,
    verificationUrl: string,
  ) {
    const content: object[] = []

    content.push(...buildClinicHeader(snapshot.clinic, logoBase64))
    content.push({ text: 'Receituário', style: 'title', alignment: 'center', margin: [0, 20, 0, 16] })
    content.push(...this.buildPatientBlock(snapshot))
    content.push(...this.buildItems(snapshot))
    if (snapshot.notes) content.push(...this.buildNotes(snapshot.notes))
    content.push(...buildSignatureFooter(snapshot))
    content.push(...this.buildVerificationQr(verificationUrl))

    return {
      content,
      header: buildContinuationHeader(snapshot.clinic),
      footer: buildPageNumberFooter(),
      defaultStyle: PDF_DEFAULT_STYLE,
      styles: PDF_STYLES,
      pageMargins: PDF_PAGE_MARGINS,
    }
  }

  private buildPatientBlock(snapshot: PrescriptionSnapshot): object[] {
    return [
      { text: 'Paciente', style: 'sectionLabel' },
      { text: snapshot.patient.name },
      { text: `CPF: ${formatCpf(snapshot.patient.documentNumber)}`, margin: [0, 0, 0, 8] },
    ]
  }

  private buildItems(snapshot: PrescriptionSnapshot): object[] {
    if (snapshot.items.length === 0) return []

    const header: object = { text: 'Medicamentos', style: 'sectionLabel' }
    const items = snapshot.items.map((item, index) => {
      const nameText = item.dosage ? `${item.name} ${item.dosage}` : item.name
      const quantityText = item.quantity ? `Quantidade: ${item.quantity}` : null

      return {
        margin: [0, 0, 0, 8],
        stack: [
          { text: `${index + 1}. ${nameText}`, bold: true },
          ...(quantityText
            ? [{ text: quantityText, margin: [12, 2, 0, 0], fontSize: 9, color: '#555555' }]
            : []),
          { text: item.instructions, margin: [12, 2, 0, 0] },
        ],
      }
    })

    return [header, ...items]
  }

  private buildNotes(notes: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: notes, margin: [0, 0, 0, 8] },
    ]
  }

  /**
   * O QR que a farmácia bipa para conferir a receita contra a fonte, fixado no
   * canto inferior direito da A4 (595.28 x 841.89, margens de 50).
   */
  private buildVerificationQr(verificationUrl: string): object[] {
    const qrSize = 100
    const rightEdge = 595.28 - 50 // page width minus right margin
    return [
      {
        qr: verificationUrl,
        fit: qrSize,
        absolutePosition: { x: rightEdge - qrSize, y: 675 },
      },
      {
        text: 'Verifique a autenticidade desta receita',
        fontSize: 7,
        color: '#555555',
        alignment: 'right',
        lineHeight: 1,
        width: 200,
        absolutePosition: { x: rightEdge - 200, y: 775 },
      },
    ]
  }
}
