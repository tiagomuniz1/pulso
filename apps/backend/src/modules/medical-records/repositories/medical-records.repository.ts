import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import {
  CreateMedicalRecordData,
  FindByPatientFilters,
  IMedicalRecordsRepository,
  UpdateMedicalRecordData,
} from './medical-records.repository.interface'

@Injectable()
export class MedicalRecordsRepository implements IMedicalRecordsRepository {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly repository: Repository<MedicalRecord>,
  ) {}

  private baseQuery() {
    return this.repository
      .createQueryBuilder('mr')
      .innerJoinAndSelect('mr.patient', 'patient')
      .innerJoinAndSelect('patient.user', 'patientUser')
      .innerJoinAndSelect('mr.professional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
      // LEFT JOIN: generalist records have specialty_id NULL — an inner join would drop them.
      .leftJoinAndSelect('mr.specialty', 'specialty')
      // INNER JOIN: o TypeORM acrescenta `deleted_at IS NULL` ao join, então
      // prontuário de consulta excluída não volta em consulta nenhuma. É a
      // decisão de produto — histórico não mostra atendimento excluído — e é
      // também o que a casa faz em relação obrigatória (ver `backend.md`).
      .innerJoinAndSelect('mr.appointment', 'appointment')
  }

  async findById(id: string, clinicId: string): Promise<MedicalRecord | null> {
    return this.baseQuery()
      .where('mr.id = :id', { id })
      .andWhere('mr.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByAppointment(appointmentId: string, clinicId: string): Promise<MedicalRecord | null> {
    return this.baseQuery()
      .where('mr.appointmentId = :appointmentId', { appointmentId })
      .andWhere('mr.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    filters: FindByPatientFilters = {},
  ): Promise<[MedicalRecord[], number]> {
    const qb = this.baseQuery()
      .where('mr.clinicId = :clinicId', { clinicId })
      .andWhere('mr.patientId = :patientId', { patientId })
      .orderBy('mr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (filters.professionalId) {
      qb.andWhere('mr.professionalId = :professionalId', { professionalId: filters.professionalId })
    }

    // A aba de histórico da consulta pede o recorte da especialidade daquele
    // atendimento. `specialtyIsNull` existe porque consulta sem especialidade
    // (generalista) tem prontuário com `specialty_id` nulo, e `= NULL` não casa.
    if (filters.specialtyId) {
      qb.andWhere('mr.specialtyId = :specialtyId', { specialtyId: filters.specialtyId })
    } else if (filters.specialtyIsNull) {
      qb.andWhere('mr.specialtyId IS NULL')
    }

    // A consulta em que o médico está não entra no próprio histórico.
    if (filters.excludeAppointmentId) {
      qb.andWhere('mr.appointmentId != :excludeAppointmentId', {
        excludeAppointmentId: filters.excludeAppointmentId,
      })
    }

    // Quem é PROFESSIONAL enxerga o que escreveu MAIS o que foi escrito nas
    // especialidades que ele exerce (ver find-medical-records-by-patient).
    // Sem isto, o segundo médico da mesma especialidade abriria o histórico
    // vazio — o caso que a funcionalidade existe para resolver.
    if (filters.visibleSpecialtyIds || filters.authorProfessionalId) {
      const ids = filters.visibleSpecialtyIds ?? []
      if (ids.length && filters.authorProfessionalId) {
        qb.andWhere(
          '(mr.specialtyId IN (:...visibleSpecialtyIds) OR mr.professionalId = :authorProfessionalId)',
          { visibleSpecialtyIds: ids, authorProfessionalId: filters.authorProfessionalId },
        )
      } else if (ids.length) {
        qb.andWhere('mr.specialtyId IN (:...visibleSpecialtyIds)', { visibleSpecialtyIds: ids })
      } else if (filters.authorProfessionalId) {
        qb.andWhere('mr.professionalId = :authorProfessionalId', {
          authorProfessionalId: filters.authorProfessionalId,
        })
      }
    }

    return qb.getManyAndCount()
  }

  async create(data: CreateMedicalRecordData, queryRunner?: QueryRunner): Promise<MedicalRecord> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    const saved = await repo.save(repo.create(data))
    return this.findById(saved.id, data.clinicId) as Promise<MedicalRecord>
  }

  async update(id: string, data: UpdateMedicalRecordData, clinicId: string, queryRunner?: QueryRunner): Promise<MedicalRecord> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    const patch: Partial<MedicalRecord> = {}
    if (data.data !== undefined) patch.data = data.data
    if (data.notes !== undefined) patch.notes = data.notes
    await repo.update(id, patch as any)
    return this.findById(id, clinicId) as Promise<MedicalRecord>
  }

  async delete(id: string, _clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(MedicalRecord) : this.repository
    await repo.softDelete(id)
  }
}
