import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'

@Injectable()
export class DisableClinicNotificationChannelUseCase extends BaseUseCase {
  private readonly logger = new Logger(DisableClinicNotificationChannelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly channelsRepository: IClinicNotificationChannelsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, channel: NotificationChannel): Promise<void> {
    await this.findClinicByIdUseCase.execute(clinicId)

    const existing = await this.channelsRepository.findByClinicAndChannel(clinicId, channel)
    // 404 rather than a silent 204: disabling something that was never enabled
    // usually means the caller is looking at a stale screen.
    if (!existing) throw new NotFoundException('Channel is not enabled for this clinic')

    await this.channelsRepository.disable(existing.id)

    try {
      await this.cacheService.delByPattern(`clinic-notification-channels:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: DisableClinicNotificationChannelUseCase.name,
        clinicId,
      })
    }
  }
}
