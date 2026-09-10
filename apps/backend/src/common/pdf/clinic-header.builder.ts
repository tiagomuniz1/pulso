import { PdfClinic } from './pdf-document.types'
import { PDF_CONTENT_WIDTH } from './pdf-styles'

/**
 * O cabeçalho de identificação da clínica: logo, nome, endereço e a régua.
 *
 * Era o mesmo código em quatro builders. O logo chega como data-URI e não como
 * URL porque o pdfmake roda com `setUrlAccessPolicy(() => false)` — quem lê a
 * imagem do storage é o `LoadClinicLogoUseCase`, antes.
 */
export function buildClinicHeader(clinic: PdfClinic, logoBase64: string | null): object[] {
  const clinicLines: object[] = [{ text: clinic.name, style: 'clinicName' }]

  const address = clinic.address
  if (address) {
    const streetLine = [address.street, address.number, address.complement].filter(Boolean).join(', ')
    const cityLine = [address.neighborhood, address.city, address.state].filter(Boolean).join(' — ')
    if (streetLine) clinicLines.push({ text: streetLine, fontSize: 9 })
    if (cityLine) clinicLines.push({ text: cityLine, fontSize: 9 })
    if (address.zipCode) clinicLines.push({ text: `CEP ${address.zipCode}`, fontSize: 9 })
  }

  // Segunda linha de defesa: o fetcher já devolve `null` para o que não
  // conseguiu validar, mas embutir qualquer coisa que não seja data-URI faz o
  // pdfmake lançar — e derruba o documento inteiro, não só o logo.
  const safeLogoBase64 = logoBase64?.startsWith('data:image/') ? logoBase64 : null

  const rule = {
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: PDF_CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' },
    ],
  }

  if (safeLogoBase64) {
    return [
      {
        columns: [{ image: safeLogoBase64, width: 150 }, { stack: clinicLines }],
        columnGap: 24,
        margin: [0, 0, 0, 4],
      },
      rule,
    ]
  }

  return [{ stack: clinicLines, margin: [0, 0, 0, 4] }, rule]
}
