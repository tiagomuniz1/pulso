/**
 * HTML do prontuário do IClinic → texto plano.
 *
 * O acervo inteiro usa cinco tags (`p`, `span`, `strong`, `br`, `s`) e uma única
 * entidade (`&gt;`), então uma biblioteca de parsing seria peso morto. O destino
 * é um campo `textarea`, renderizado com `whitespace-pre-wrap` — o que importa é
 * preservar parágrafos e quebras, não negrito nem cor.
 */

const ENTITIES: Record<string, string> = {
  '&gt;': '>',
  '&lt;': '<',
  '&amp;': '&',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
}

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  const text = html
    // <br> e o fim de cada bloco viram quebra; o começo do bloco não, senão
    // todo texto nasceria com uma linha em branco na frente.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    // O resto some preservando o conteúdo.
    .replace(/<[^>]+>/g, '')

  return decodeEntities(text)
    .replace(/\r\n?/g, '\n')
    // Espaço em branco no fim da linha só atrapalha a comparação em teste.
    .replace(/[ \t]+\n/g, '\n')
    // Três ou mais quebras viram parágrafo: o editor do IClinic gerava
    // `<p>\n</p>` como linha vazia, e cada uma virava duas quebras aqui.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeEntities(text: string): string {
  return text
    .replace(/&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;/g, (entity) => {
      const known = ENTITIES[entity.toLowerCase()]
      if (known !== undefined) return known

      const numeric = /^&#(x?)([0-9a-fA-F]+);$/.exec(entity)
      if (!numeric) return entity

      const code = parseInt(numeric[2], numeric[1] ? 16 : 10)
      return Number.isNaN(code) ? entity : String.fromCodePoint(code)
    })
}
