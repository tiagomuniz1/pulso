import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentLabelResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { toAppointmentLabelResponse } from '../appointment-label.mapper'

const CACHE_TTL_IN_SECONDS = 600

@Injectable()
export class GetAppointmentLabelUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetAppointmentLabelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly labelsRepository: IAppointmentLabelsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<AppointmentLabelResponseDto> {
    const clinicId = currentUser.clinicId!
    const cacheKey = `appointment_label:${clinicId}:${id}`

    try {
      const cached = await this.cacheService.get<AppointmentLabelResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetAppointmentLabelUseCase.name })
    }

    const label = await this.labelsRepository.findById(id, clinicId)
    if (!label) throw new NotFoundException('Label not found')

    const result = toAppointmentLabelResponse(label)

    try {
      await this.cacheService.set(cacheKey, result, CACHE_TTL_IN_SECONDS)
    } catch {
      this.logger.warn('Cache write failed', { context: GetAppointmentLabelUseCase.name })
    }

    return result
  }
}
