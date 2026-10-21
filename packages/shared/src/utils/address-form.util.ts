/**
 * O bloco de endereço de um formulário, como a pessoa o digitou.
 *
 * Tudo opcional e tudo `string`: é o estado cru do formulário, antes de
 * qualquer validação. O que a API recebe é outra coisa, e a conversão entre
 * as duas é o que este arquivo faz.
 */
export interface IAddressFormValues {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

/** O endereço normalizado que vai no corpo da requisição. */
export interface INormalizedAddress {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

/**
 * O endereço é opcional **em bloco**: ou a pessoa não mexeu nele, ou
 * preencheu. Um campo só digitado já torna o bloco obrigatório, porque meio
 * endereço não entrega carta nenhuma.
 */
export function hasAnyAddressValue(address: IAddressFormValues | undefined): boolean {
  if (!address) return false
  return Object.values(address).some((value) => typeof value === 'string' && value.trim() !== '')
}

/**
 * Bloco do formulário → o `address` que vai para a API, ou nada.
 *
 * Mora no `@app/shared` porque a normalização é a mesma dos dois lados e
 * **silenciosa quando diverge**: a UF em minúsculas e o país ausente passam
 * pelo formulário sem erro e só aparecem errados no cadastro, semanas
 * depois. Deixar cada cliente lembrar de `toUpperCase()` é esperar que um
 * deles esqueça.
 *
 * Quem chama garante que o bloco está completo — a validação é de cada lado,
 * porque as mensagens são da interface.
 */
export function toNormalizedAddress(
  address: IAddressFormValues | undefined,
): INormalizedAddress | undefined {
  if (!hasAnyAddressValue(address)) return undefined

  const filled = address as Required<IAddressFormValues>
  return {
    street: filled.street.trim(),
    number: filled.number.trim(),
    complement: address?.complement?.trim() ? address.complement.trim() : null,
    neighborhood: filled.neighborhood.trim(),
    city: filled.city.trim(),
    state: filled.state.trim().toUpperCase(),
    zipCode: filled.zipCode.trim(),
    country: address?.country?.trim() ? address.country.trim().toUpperCase() : 'BR',
  }
}
