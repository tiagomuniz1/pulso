import { QueryRunner } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import { MedicalRecordTemplateField } from '../../medical-record-templates/entities/medical-record-template.entity'

export interface CreateMedicalRecordData {
  clinicId: string
  appointmentId: string
  patientId: string
  professionalId: string
  specialtyId: string | null
  templateId: string
  templateSchemaSnapshot: MedicalRecordTemplateField[]
  data: Record<string, unknown>
  notes: string | null
}

export interface UpdateMedicalRecordData {
  data?: Record<string, unknown>
  notes?: string | null
}

/**
 * Recortes do histórico de prontuários de um paciente.
 *
 * `visibleSpecialtyIds` + `authorProfessionalId` juntos expressam a regra do
 * PROFESSIONAL: ele lê o que escreveu MAIS o que foi escrito nas especialidades
 * que exerce. São OR entre si, não AND.
 */
export interface FindByPatientFilters {
  /** Filtro explícito pedido pelo cliente (ADMIN escolhendo um profissional). */
  professionalId?: string
  /** Recorte por especialidade — o da consulta, na aba de histórico. */
  specialtyId?: string
  /** Consulta generalista: prontuário com `specialty_id` nulo. */
  specialtyIsNull?: boolean
  /** A consulta atual não entra no próprio histórico. */
  excludeAppointmentId?: string
  /** Especialidades que o profissional exerce. */
  visibleSpecialtyIds?: string[]
  /** O próprio profissional, que sempre lê o que escreveu. */
  authorProfessionalId?: string
}

export abstract class IMedicalRecordsRepository {
  abstract findById(id: string, clinicId: string): Promise<MedicalRecord | null>
  abstract findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalRecord | null>
  abstract findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    filters?: FindByPatientFilters,
  ): Promise<[MedicalRecord[], number]>
  abstract create(data: CreateMedicalRecordData, queryRunner?: QueryRunner): Promise<MedicalRecord>
  abstract update(id: string, data: UpdateMedicalRecordData, clinicId: string, queryRunner?: QueryRunner): Promise<MedicalRecord>
  abstract delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void>
}
