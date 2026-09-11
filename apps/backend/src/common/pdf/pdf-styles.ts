/**
 * Os estilos que os documentos em PDF compartilham.
 *
 * Estavam copiados em cada builder. `PDF_STYLES` é espalhável para o documento
 * que precisar de um estilo próprio:
 *
 * ```ts
 * styles: { ...PDF_STYLES, itemName: { fontSize: 11, bold: true } }
 * ```
 */

export const PDF_DEFAULT_STYLE = { font: 'Roboto', fontSize: 10, lineHeight: 1.4 }

export const PDF_STYLES = {
  title: { fontSize: 16, bold: true },
  sectionLabel: { fontSize: 10, bold: true, margin: [0, 12, 0, 4] },
  clinicName: { fontSize: 13, bold: true },
  footerCity: { fontSize: 10, margin: [0, 24, 0, 32] },
}

export const PDF_PAGE_MARGINS = [50, 50, 50, 50]

/** Largura útil da A4 com as margens acima — a régua do cabeçalho a usa. */
export const PDF_CONTENT_WIDTH = 495
