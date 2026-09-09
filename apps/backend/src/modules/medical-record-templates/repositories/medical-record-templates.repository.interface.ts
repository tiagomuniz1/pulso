import { QueryRunner } from 'typeorm'
import { CouncilType } from '@app/shared'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'

/**
 * Recorte de leitura do profissional sobre o catálogo da clínica: as
 * especialidades que ele exerce e o generalista da profissão dele.
 */
export interface TemplateReadScope {
  specialtyIds: string[]
  councilType: CouncilType | null
}

export abstract class IMedicalRecordTemplatesRepository {
  abstract findAll(
    clinicId: string,
    page: number,
    limit: number,
    specialtyId?: string,
    generalist?: boolean,
    councilType?: CouncilType,
    scope?: TemplateReadScope,
  ): Promise<[MedicalRecordTemplate[], number]>
  abstract findById(id: string, clinicId: string): Promise<MedicalRecordTemplate | null>
  abstract findByClinicAndSpecialty(
    clinicId: string,
    specialtyId: string | null,
    councilType?: CouncilType | null,
  ): Promise<MedicalRecordTemplate | null>
  abstract create(
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate>
  abstract update(
    id: string,
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate>
  abstract delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void>
}
