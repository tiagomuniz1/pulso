/**
 * Endereço no frontend. Vive fora de `components/features/*` porque duas
 * features o usam — clínica e paciente — e uma importar os types da outra
 * atravessaria a fronteira entre elas.
 */
export interface IAddressModel {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface IAddressInput {
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country?: string
}
