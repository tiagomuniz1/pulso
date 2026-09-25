import { KinshipType, PatientGender } from '@app/shared'
import type { IAddressModel } from '@/types/address.types'

export interface IPatientResponsibleRef {
  id: string
  fullName: string
  documentNumber: string | null
}

export interface IPatientDependentRef {
  id: string
  fullName: string
  kinshipType: KinshipType
}

export interface IPatientModel {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  birthDate: Date
  documentNumber: string | null
  gender: PatientGender
  responsiblePatientId: string | null
  kinshipType: KinshipType | null
  responsiblePatient: IPatientResponsibleRef | null
  dependents: IPatientDependentRef[]
  address: IAddressModel | null
  createdAt: Date
  updatedAt: Date
}
