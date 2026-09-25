import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicNotificationChannelResponseDto, NotificationChannel } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'

@Injectable()
export class EnableClinicNotificationChannelUseCase extends BaseUseCase {
  private readonly logger = new Logger(EnableClinicNotificationChannelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly channelsRepository: IClinicNotificationChannelsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    clinicId: string,
    channel: NotificationChannel,
  ): Promise<ClinicNotificationChannelResponseDto> {
    await this.findClinicByIdUseCase.execute(clinicId)

    const existing = await this.channelsRepository.findByClinicAndChannel(clinicId, channel)
    if (existing) throw new ConflictException('Channel is already enabled for this clinic')

    const record = await this.channelsRepository.enable(clinicId, channel)

    try {
      await this.cacheService.delByPattern(`clinic-notification-channels:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: EnableClinicNotificationChannelUseCase.name,
        clinicId,
      })
    }

    return this.toResponse(record)
  }

  private toResponse(record: ClinicNotificationChannel): ClinicNotificationChannelResponseDto {
    return {
      id: record.id,
      clinicId: record.clinicId,
      channel: record.channel,
      enabledAt: record.createdAt,
    }
  }
}
