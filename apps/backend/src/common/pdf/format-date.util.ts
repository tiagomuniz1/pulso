const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * "4 de setembro de 2026" — a data por extenso do rodapé.
 *
 * Lê em UTC de propósito. `issuedAt` é o instante gravado na emissão e o
 * servidor pode estar em qualquer fuso; ler com `getDate()` faria o mesmo
 * documento mudar de dia conforme a máquina que o gera.
 */
export function formatDateLong(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  return `${date.getUTCDate()} de ${MONTHS_PT[date.getUTCMonth()]} de ${date.getUTCFullYear()}`
}

/** "04/09/2026" a partir de uma data pura `YYYY-MM-DD`, sem passar por `Date`. */
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}
