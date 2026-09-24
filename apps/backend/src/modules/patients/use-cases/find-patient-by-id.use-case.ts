import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PatientResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPatientsRepository } from '../repositories/patients.repository.interface'
import { Patient } from '../entities/patient.entity'
import { PatientResponseMapper } from '../mappers/patient-response.mapper'

@Injectable()
export class FindPatientByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindPatientByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
    private readonly patientResponseMapper: PatientResponseMapper,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<PatientResponseDto> {
    const clinicId = currentUser.clinicId!
    const cacheKey = `patient:${clinicId}:${id}`

    try {
      const cached = await this.cacheService.get<PatientResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindPatientByIdUseCase.name })
    }

    const patient = await this.patientsRepository.findById(id, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    let responsiblePatient: Patient | null = null
    if (patient.responsiblePatientId) {
      responsiblePatient = await this.patientsRepository.findById(patient.responsiblePatientId, clinicId)
    }
    const dependents = await this.patientsRepository.findActiveDependents(id, clinicId)

    const response = this.patientResponseMapper.toResponse(patient, responsiblePatient, dependents)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindPatientByIdUseCase.name })
    }

    return response
  }

}
