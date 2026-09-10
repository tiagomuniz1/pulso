import { COUNCIL_TYPE_LABELS } from '@app/shared'
import { formatDateLong } from './format-date.util'
import { PdfSignedDocument } from './pdf-document.types'

/**
 * Cidade e data por extenso, linha de assinatura, nome, conselho e especialidade.
 *
 * Vale para os documentos **emitidos** — receita, atestado, pedido de exame e
 * indicação de vacina —, cujo conteúdo é assinado por quem o redigiu. O PDF do
 * prontuário não usa este rodapé: é cópia de um registro, não documento
 * atestado (ver `ai/context/permissions.md` → Prontuários).
 *
 * Tudo vem do snapshot congelado na emissão, nunca do estado atual do
 * profissional: o documento diz o que era verdade no dia em que saiu.
 */
export function buildSignatureFooter(document: PdfSignedDocument): object[] {
  const city = document.clinic.address?.city ?? null
  const dateFormatted = formatDateLong(document.issuedAt)
  const cityDateLine = city ? `${city}, ${dateFormatted}` : dateFormatted

  const { name, councilType, registrationNumber, registryNumber, specialtyName } =
    document.professional

  const footerStack: object[] = [
    { text: cityDateLine, style: 'footerCity' },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
    { text: name, bold: true },
    {
      text: `${COUNCIL_TYPE_LABELS[councilType]} ${registrationNumber}${registryNumber ? ` · RQE ${registryNumber}` : ''}`,
      fontSize: 9,
    },
  ]

  if (specialtyName) footerStack.push({ text: specialtyName, fontSize: 9 })

  return footerStack
}
