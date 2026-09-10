/**
 * Formata o CPF para exibição num documento.
 *
 * Devolve o valor cru quando não tem onze dígitos: um documento com um CPF
 * estranho impresso como veio é melhor que um documento que não sai, e o dado
 * torto fica visível para quem for corrigir o cadastro.
 */
export function formatCpf(cpf: string | null): string {
  if (!cpf) return 'Não informado'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
