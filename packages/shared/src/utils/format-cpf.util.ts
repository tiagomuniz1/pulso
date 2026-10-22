export function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const len = digits.length
  if (len === 0) return ''
  if (len <= 3) return digits
  if (len <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (len <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatCpf(digits: string | null): string {
  if (!digits) return ''
  const d = digits.replace(/\D/g, '')
  if (d.length !== 11) return digits
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/**
 * O CPF como o backend o quer: onze dígitos, sem pontuação.
 *
 * O contrato é `/^\d{11}$/` — mandar o valor mascarado que está na tela
 * devolve `400`. A web fazia isso com um `.replace(/\D/g, '')` solto em
 * dois lugares e o app não fazia em lugar nenhum, então **cadastrar
 * paciente com CPF falhava sempre no celular**. Com a função aqui, ao lado
 * da máscara, a dupla fica à vista: uma veste, a outra despe.
 */
export function cpfDigits(value: string): string {
  return value.replace(/\D/g, '')
}
