import type { AddressDto, CreatePatientDto } from '@app/shared'
import type { IAddressInput } from '@/types/address.types'
import type { ICreatePatientInput } from '../types/patient-input.types'

export function toCreatePatientDto(input: ICreatePatientInput): CreatePatientDto {
  return {
    userId: input.userId,
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    birthDate: input.birthDate,
    documentNumber: input.documentNumber,
    gender: input.gender,
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
