import { QueryRunner } from 'typeorm'
import { AddressDto, KinshipType, PatientGender } from '@app/shared'
import { Patient } from '../entities/patient.entity'

export interface CreatePatientData {
  userId: string
  clinicId: string
  documentNumber: string | null
  phoneNumber: string
  birthDate: string
  gender: PatientGender
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
  // Objeto aninhado como no contrato da API; o repositório é quem achata para
  // as 8 colunas `address_*` (mesmo desenho de `clinics`).
  address?: AddressDto | null
}

export interface UpdatePatientData {
  phoneNumber?: string
  birthDate?: string
  gender?: PatientGender
  documentNumber?: string | null
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
  address?: AddressDto | null
}

export abstract class IPatientsRepository {
  abstract findAll(
    page: number,
    limit: number,
    clinicId: string,
    search?: string,
    excludeDependents?: boolean,
    excludeId?: string,
  ): Promise<[Patient[], number]>
  abstract findById(id: string, clinicId: string): Promise<Patient | null>
  abstract findByUserId(userId: string): Promise<Patient | null>
  abstract findByDocumentNumber(documentNumber: string, clinicId: string): Promise<Patient | null>
  abstract findByFullNameAndBirthDate(
    fullName: string,
    birthDate: string,
    clinicId: string,
  ): Promise<Patient | null>
  abstract findActiveDependents(responsiblePatientId: string, clinicId: string): Promise<Patient[]>
  abstract findResponsiblePatientsByIds(ids: string[], clinicId: string): Promise<Patient[]>
  abstract findDependentsByResponsibleIds(responsibleIds: string[], clinicId: string): Promise<Patient[]>
  abstract create(data: CreatePatientData, queryRunner?: QueryRunner): Promise<Patient>
  abstract update(id: string, data: UpdatePatientData, queryRunner?: QueryRunner): Promise<Patient>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
