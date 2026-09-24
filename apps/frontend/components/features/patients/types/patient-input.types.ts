import { KinshipType, PatientGender } from '@app/shared'
import type { IAddressInput } from '@/types/address.types'

export interface ICreatePatientInput {
  userId?: string
  fullName?: string
  email?: string
  phoneNumber: string
  birthDate: string
  documentNumber?: string
  gender: PatientGender
  responsiblePatientId?: string
  kinshipType?: KinshipType
  address?: IAddressInput
}

export interface IUpdatePatientInput {
  fullName?: string
  email?: string
  phoneNumber?: string
  birthDate?: string
  gender?: PatientGender
  documentNumber?: string
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
  address?: IAddressInput
}

export interface IPatientListParams {
  search?: string
  page?: number
  limit?: number
  excludeDependents?: boolean
  excludeId?: string
}
