import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentLabelResponseDto, CreateAppointmentLabelDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AppointmentLabel } from '../entities/appointment-label.entity'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { toAppointmentLabelResponse } from '../appointment-label.mapper'
import { toAppointmentLabelNameConflict } from '../utils/appointment-label-name-conflict.util'

@Injectable()
export class CreateAppointmentLabelUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateAppointmentLabelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly labelsRepository: IAppointmentLabelsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    dto: CreateAppointmentLabelDto,
    currentUser: ICurrentUser,
  ): Promise<AppointmentLabelResponseDto> {
    const clinicId = currentUser.clinicId!

    let created: AppointmentLabel
    try {
      created = await this.labelsRepository.create(
        { name: dto.name, color: dto.color },
        clinicId,
      )
    } catch (error) {
      throw toAppointmentLabelNameConflict(error)
    }

    try {
      await this.cacheService.delByPattern(`appointment_labels:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: CreateAppointmentLabelUseCase.name,
      })
    }

    return toAppointmentLabelResponse(created)
  }
}
