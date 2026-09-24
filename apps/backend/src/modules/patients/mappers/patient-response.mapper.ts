import { Injectable } from '@nestjs/common'
import { PatientResponseDto } from '@app/shared'
import { Patient } from '../entities/patient.entity'

/**
 * A resposta de paciente, num lugar só.
 *
 * Antes dela os quatro use-cases (create, update, find-by-id, list) carregavam
 * cópias idênticas de um `toResponse` privado — acrescentar um campo à resposta
 * significava editar as quatro e torcer para não esquecer nenhuma. Espelha o
 * `ClinicResponseMapper`, inclusive no sentinela de endereço: as 8 colunas
 * `address_*` só existem juntas, então `addressStreet` decide se há endereço.
 */
@Injectable()
export class PatientResponseMapper {
  toResponse(
    patient: Patient,
    responsiblePatient: Patient | null,
    dependents: Patient[] = [],
  ): PatientResponseDto {
    return {
      id: patient.id,
      user: {
        id: patient.user.id,
        fullName: patient.user.fullName,
        email: patient.user.email,
        isActive: patient.user.isActive,
      },
      documentNumber: patient.documentNumber,
      phoneNumber: patient.phoneNumber,
      birthDate: patient.birthDate,
      gender: patient.gender,
      responsiblePatientId: patient.responsiblePatientId,
      kinshipType: patient.kinshipType,
      responsiblePatient: responsiblePatient
        ? {
            id: responsiblePatient.id,
            fullName: responsiblePatient.user.fullName,
            documentNumber: responsiblePatient.documentNumber,
          }
        : null,
      dependents: dependents.map((dependent) => ({
        id: dependent.id,
        fullName: dependent.user.fullName,
        kinshipType: dependent.kinshipType!,
      })),
      address:
        patient.addressStreet != null
          ? {
              street: patient.addressStreet,
              number: patient.addressNumber!,
              complement: patient.addressComplement,
              neighborhood: patient.addressNeighborhood!,
              city: patient.addressCity!,
              state: patient.addressState!,
              zipCode: patient.addressZipCode!,
              country: patient.addressCountry!,
            }
        : null,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }
  }
}
