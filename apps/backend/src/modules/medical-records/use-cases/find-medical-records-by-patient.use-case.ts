import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, PaginatedMedicalRecordsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import {
  FindByPatientFilters,
  IMedicalRecordsRepository,
} from '../repositories/medical-records.repository.interface'
import { MedicalRecordListQueryDto } from '../dto/medical-record-list-query.dto'
import { toMedicalRecordResponse } from './create-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

@Injectable()
export class FindMedicalRecordsByPatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicalRecordsByPatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    patientId: string,
    query: MedicalRecordListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordsResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page, limit } = query

    const filters: FindByPatientFilters = {
      professionalId: query.professionalId,
      excludeAppointmentId: query.excludeAppointmentId,
    }

    // Recorte por especialidade. `specialtyId: 'null'` é o caso generalista:
    // consulta sem especialidade gera prontuário com `specialty_id` nulo, e o
    // cliente precisa de um jeito de pedir exatamente esses.
    if (query.specialtyId === 'null') {
      filters.specialtyIsNull = true
    } else if (query.specialtyId) {
      filters.specialtyId = query.specialtyId
    }

    // O PROFESSIONAL passa a ler o que escreveu MAIS o que foi escrito nas
    // especialidades que ele exerce. Antes lia só os próprios, e o segundo
    // médico da mesma especialidade abria o histórico vazio — justamente o caso
    // em que precisar do histórico faz mais sentido.
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      filters.authorProfessionalId = professional?.id
      filters.visibleSpecialtyIds = (professional?.professionalSpecialties ?? []).map(
        (ps) => ps.specialtyId,
      )
    }

    const cacheKey = [
      'medical_records:patient',
      patientId,
      page,
      limit,
      filters.professionalId ?? 'all',
      filters.specialtyId ?? (filters.specialtyIsNull ? 'null' : 'all'),
      filters.excludeAppointmentId ?? 'none',
      filters.authorProfessionalId ?? 'any',
      (filters.visibleSpecialtyIds ?? []).slice().sort().join('|') || 'any',
    ].join(':')
    try {
      const cached = await this.cacheService.get<PaginatedMedicalRecordsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: 'FindMedicalRecordsByPatientUseCase' })
    }

    const [records, total] = await this.medicalRecordsRepository.findByPatient(
      clinicId,
      patientId,
      page,
      limit,
      filters,
    )

    const data: MedicalRecordResponseDto[] = records.map(toMedicalRecordResponse)
    const result: PaginatedMedicalRecordsResponseDto = { data, total, page, limit }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: 'FindMedicalRecordsByPatientUseCase' })
    }

    return result
  }
}
