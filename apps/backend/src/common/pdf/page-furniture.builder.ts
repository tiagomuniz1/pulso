import { PdfClinic } from './pdf-document.types'

/**
 * O que se repete a cada página: identificação nas continuações e numeração.
 *
 * Nenhum dos documentos emitidos costuma passar de uma página, mas quando
 * passavam a página 2 saía anônima — sem dizer de que clínica é nem que há uma
 * página 1. O prontuário, que é longo por natureza, tornou isso rotina.
 *
 * As duas funções **não aparecem na primeira página de um documento de página
 * única**: quem só tem uma página não precisa saber que é a de número um, e
 * assim os documentos que já existiam continuam saindo exatamente como saíam.
 */

/** Identificação enxuta no topo das páginas 2 em diante. */
export function buildContinuationHeader(clinic: PdfClinic) {
  return (currentPage: number) => {
    if (currentPage === 1) return undefined
    return {
      text: clinic.name,
      fontSize: 8,
      color: '#555555',
      margin: [50, 18, 50, 0],
    }
  }
}

/**
 * "2 de 3" no rodapé — só quando há mais de uma página.
 *
 * Num documento de uma página só, "1 de 1" é ruído. Em dois ou mais, é o que
 * permite a quem recebe uma impressão saber que não falta folha.
 */
export function buildPageNumberFooter() {
  return (currentPage: number, pageCount: number) => {
    if (pageCount <= 1) return undefined
    return {
      text: `${currentPage} de ${pageCount}`,
      alignment: 'right',
      fontSize: 8,
      color: '#555555',
      margin: [0, 10, 50, 0],
    }
  }
}
