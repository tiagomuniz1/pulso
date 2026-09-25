import type { AddressDto, UpdatePatientDto } from '@app/shared'
import type { IAddressInput } from '@/types/address.types'
import type { IUpdatePatientInput } from '../types/patient-input.types'

export function toUpdatePatientDto(input: IUpdatePatientInput): UpdatePatientDto {
  return {
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    birthDate: input.birthDate,
    gender: input.gender,
    documentNumber: input.documentNumber,
    responsiblePatientId: input.responsiblePatientId,
    kinshipType: input.kinshipType,
    address: toAddressDto(input.address),
  }
}

/**
 * `IAddressInput` deixa `country` opcional (o formulário não pergunta), mas o
 * `AddressDto` o exige — o backend tem default 'BR' e o contrato o reflete.
 * Preencher aqui evita que cada chamador repita o mesmo `?? 'BR'`.
 */
function toAddressDto(address: IAddressInput | undefined): AddressDto | undefined {
  if (!address) return undefined
  return { ...address, country: address.country ?? 'BR' }
}
