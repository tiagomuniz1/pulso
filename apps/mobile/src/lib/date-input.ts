/**
 * Data como texto com máscara, não como seletor nativo.
 *
 * A web usa `<input type="date">`, que no navegador do celular **é** o
 * seletor do sistema — então copiar a web ao pé da letra levaria a um
 * picker. A escolha aqui é outra de propósito: o campo mais usado é data de
 * nascimento, e um seletor de calendário para 15/05/1962 custa dezenas de
 * toques para voltar setenta anos. Digitar oito dígitos custa oito.
 *
 * Onde a data é próxima — validade de agenda, por exemplo — o custo do
 * seletor seria baixo, mas um app com dois jeitos de pedir data é pior do
 * que um com um jeito só.
 */

/** "15051990" → "15/05/1990", recortando o que passa de oito dígitos. */
export function applyDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * "15/05/1990" → "1990-05-15", que é o que a API recebe. `null` quando a
 * data não existe no calendário — 31/02 passa por qualquer regex e não é
 * dia nenhum.
 */
export function toIsoDate(masked: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked.trim())
  if (!match) return null

  const [, day, month, year] = match
  const date = new Date(`${year}-${month}-${day}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  // `new Date('2026-02-31')` não falha: rola para 03/03. Comparar de volta é
  // o que separa uma data válida de uma que o construtor consertou sozinho.
  const sameDay =
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)

  return sameDay ? `${year}-${month}-${day}` : null
}

/** O caminho de volta, para abrir o formulário de edição preenchido. */
export function fromIsoDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** A data é no futuro? Usado pela data de nascimento, que não pode ser. */
export function isFutureDate(isoDate: string): boolean {
  const date = new Date(`${isoDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() > today.getTime()
}
