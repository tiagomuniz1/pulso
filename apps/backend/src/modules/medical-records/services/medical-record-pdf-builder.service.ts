import { Injectable } from '@nestjs/common'
import { MedicalRecordTemplateFieldDto, MedicalRecordTemplateSectionDto } from '@app/shared'
import { buildClinicHeader } from '../../../common/pdf/clinic-header.builder'
import { formatCpf } from '../../../common/pdf/format-cpf.util'
import { formatDateBR } from '../../../common/pdf/format-date.util'
import {
  buildContinuationHeader,
  buildPageNumberFooter,
} from '../../../common/pdf/page-furniture.builder'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { PdfClinic } from '../../../common/pdf/pdf-document.types'
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES } from '../../../common/pdf/pdf-styles'
import { formatRecordFieldValue } from '../utils/format-record-field-value.util'

/** Tudo que o PDF precisa saber. Montado ao vivo — o prontuário não tem snapshot. */
export interface MedicalRecordPdfData {
  clinic: PdfClinic
  patient: { name: string; documentNumber: string | null }
  professionalName: string
  specialtyName: string | null
  appointmentDate: string
  appointmentStartTime: string
  fields: MedicalRecordTemplateFieldDto[]
  data: Record<string, unknown>
  notes: string | null
  /** Vem do modelo vivo. Vazio quando ele foi excluído — aí sai lista plana. */
  sections: MedicalRecordTemplateSectionDto[]
}

@Injectable()
export class MedicalRecordPdfBuilderService {
  constructor(private readonly pdfDocumentService: PdfDocumentService) {}

  async build(data: MedicalRecordPdfData, logoBase64: string | null): Promise<Buffer> {
    return this.pdfDocumentService.render(this.buildDocDefinition(data, logoBase64))
  }

  private buildDocDefinition(data: MedicalRecordPdfData, logoBase64: string | null) {
    const content: object[] = []

    content.push(...buildClinicHeader(data.clinic, logoBase64))
    content.push({ text: 'Prontuário', style: 'title', alignment: 'center', margin: [0, 20, 0, 16] })
    content.push(...this.buildIdentification(data))
    content.push(...this.buildFields(data))
    if (data.notes) content.push(...this.buildNotes(data.notes))

    // Sem rodapé de assinatura, ao contrário de receita, atestado, pedido de
    // exame e indicação de vacina. Este PDF é cópia de um registro, não
    // documento atestado: quem atendeu está identificado acima, e não há
    // conselho nem registro porque não há nada sendo assinado.
    return {
      content,
      header: buildContinuationHeader(data.clinic),
      footer: buildPageNumberFooter(),
      defaultStyle: PDF_DEFAULT_STYLE,
      styles: { ...PDF_STYLES, fieldLabel: { fontSize: 9, bold: true, color: '#555555' } },
      pageMargins: PDF_PAGE_MARGINS,
    }
  }

  private buildIdentification(data: MedicalRecordPdfData): object[] {
    return [
      {
        columns: [
          {
            stack: [
              { text: 'Paciente', style: 'fieldLabel' },
              { text: data.patient.name },
              { text: `CPF ${formatCpf(data.patient.documentNumber)}`, fontSize: 9 },
            ],
          },
          {
            stack: [
              { text: 'Atendimento', style: 'fieldLabel' },
              { text: `${formatDateBR(data.appointmentDate)} às ${data.appointmentStartTime}` },
              { text: data.specialtyName ?? 'Clínica geral', fontSize: 9 },
            ],
          },
          {
            stack: [
              { text: 'Profissional', style: 'fieldLabel' },
              { text: data.professionalName },
            ],
          },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 12],
      },
    ]
  }

  /**
   * Os campos, agrupados nas seções do modelo.
   *
   * O `sectionKey` de cada campo está congelado no prontuário, mas os títulos
   * das seções vivem no modelo — que pode ter sido renomeado ou excluído. Sem
   * seções, sai a lista plana na ordem congelada, que é o que a tela também faz.
   */
  private buildFields(data: MedicalRecordPdfData): object[] {
    const ordered = [...data.fields].sort((a, b) => a.order - b.order)
    if (ordered.length === 0) return []

    const sectionsInOrder = [...data.sections].sort((a, b) => a.order - b.order)
    const knownSectionKeys = new Set(sectionsInOrder.map((section) => section.key))

    // Campo cuja seção não existe mais cai no bloco sem título, junto com os
    // que nunca tiveram seção — some do documento seria pior.
    const looseFields = ordered.filter(
      (field) => !field.sectionKey || !knownSectionKeys.has(field.sectionKey),
    )

    const blocks: object[] = []
    if (looseFields.length > 0) {
      blocks.push(...this.buildFieldRows(looseFields, data.data))
    }

    for (const section of sectionsInOrder) {
      const sectionFields = ordered.filter((field) => field.sectionKey === section.key)
      if (sectionFields.length === 0) continue
      blocks.push({ text: section.title, style: 'sectionLabel' })
      blocks.push(...this.buildFieldRows(sectionFields, data.data))
    }

    return blocks
  }

  private buildFieldRows(
    fields: MedicalRecordTemplateFieldDto[],
    values: Record<string, unknown>,
  ): object[] {
    return fields.map((field) => ({
      // Sem isto, um rótulo pode terminar no pé de uma página e o valor
      // começar na seguinte — que é a maneira mais fácil de um prontuário
      // impresso ser lido errado.
      unbreakable: true,
      margin: [0, 0, 0, 8],
      stack: [
        { text: field.label, style: 'fieldLabel' },
        { text: formatRecordFieldValue(field, values[field.key!]) },
      ],
    }))
  }

  private buildNotes(notes: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: notes },
    ]
  }
}
