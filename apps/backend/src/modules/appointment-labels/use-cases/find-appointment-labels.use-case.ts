import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedAppointmentLabelsResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AppointmentLabelListQueryDto } from '../dto/appointment-label-list-query.dto'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { toAppointmentLabelResponse } from '../appointment-label.mapper'

/** Catálogo curado à mão, que muda um punhado de vezes por ano. */
const CACHE_TTL_IN_SECONDS = 600

@Injectable()
export class FindAppointmentLabelsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAppointmentLabelsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly labelsRepository: IAppointmentLabelsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: AppointmentLabelListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedAppointmentLabelsResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page = 1, limit = 20, isActive } = query

    const cacheKey = `appointment_labels:list:${clinicId}:${page}:${limit}:${isActive ?? 'any'}`

    try {
      const cached = await this.cacheService.get<PaginatedAppointmentLabelsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAppointmentLabelsUseCase.name })
    }

    const [labels, total] = await this.labelsRepository.findAll(clinicId, page, limit, isActive)

    const result: PaginatedAppointmentLabelsResponseDto = {
      data: labels.map(toAppointmentLabelResponse),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, CACHE_TTL_IN_SECONDS)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAppointmentLabelsUseCase.name })
    }

    return result
  }
}
