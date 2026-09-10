import { Injectable } from '@nestjs/common'
import { MedicalCertificateSnapshot, MedicalCertificateType } from '@app/shared'
import { buildClinicHeader } from '../../../common/pdf/clinic-header.builder'
import { formatCpf } from '../../../common/pdf/format-cpf.util'
import { formatDateBR } from '../../../common/pdf/format-date.util'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES } from '../../../common/pdf/pdf-styles'
import { buildSignatureFooter } from '../../../common/pdf/signature-footer.builder'

@Injectable()
export class MedicalCertificatePdfBuilderService {
  constructor(private readonly pdfDocumentService: PdfDocumentService) {}

  async build(snapshot: MedicalCertificateSnapshot, logoBase64: string | null): Promise<Buffer> {
    return this.pdfDocumentService.render(this.buildDocDefinition(snapshot, logoBase64))
  }

  private buildDocDefinition(snapshot: MedicalCertificateSnapshot, logoBase64: string | null) {
    const content: object[] = []

    content.push(...buildClinicHeader(snapshot.clinic, logoBase64))
    content.push({ text: 'Atestado', style: 'title', alignment: 'center', margin: [0, 20, 0, 16] })
    content.push(...this.buildBody(snapshot))
    if (snapshot.observations) content.push(...this.buildObservations(snapshot.observations))
    content.push(...buildSignatureFooter(snapshot))

    return {
      content,
      defaultStyle: PDF_DEFAULT_STYLE,
      styles: PDF_STYLES,
      pageMargins: PDF_PAGE_MARGINS,
    }
  }

  private buildBody(snapshot: MedicalCertificateSnapshot): object[] {
    const cpfFormatted = formatCpf(snapshot.patient.documentNumber)

    if (snapshot.type === MedicalCertificateType.LEAVE) {
      const startDateFormatted = formatDateBR(snapshot.startDate!)
      const dayLabel = snapshot.daysOff === 1 ? 'dia' : 'dias'
      const lines: object[] = [
        {
          text: `Atesto, para os devidos fins, que o(a) paciente ${snapshot.patient.name} (CPF ${cpfFormatted}) necessita afastar-se de suas atividades por ${snapshot.daysOff} ${dayLabel}, a partir de ${startDateFormatted}.`,
          margin: [0, 0, 0, 8],
        },
      ]
      if (snapshot.cidCode) {
        lines.push({ text: `CID: ${snapshot.cidCode}.`, margin: [0, 0, 0, 8] })
      }
      return lines
    }

    const attendanceDateFormatted = formatDateBR(snapshot.attendanceDate!)
    return [
      {
        text: `Atesto, para os devidos fins, que o(a) paciente ${snapshot.patient.name} (CPF ${cpfFormatted}) compareceu a esta consulta em ${attendanceDateFormatted}, no período das ${snapshot.checkInTime} às ${snapshot.checkOutTime}.`,
        margin: [0, 0, 0, 8],
      },
    ]
  }

  private buildObservations(observations: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: observations, margin: [0, 0, 0, 8] },
    ]
  }
}
