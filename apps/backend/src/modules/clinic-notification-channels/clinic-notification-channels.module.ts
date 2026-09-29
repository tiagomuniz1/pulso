import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { ClinicNotificationChannelsController } from './controllers/clinic-notification-channels.controller'
import { ClinicNotificationChannel } from './entities/clinic-notification-channel.entity'
import { IClinicNotificationChannelsRepository } from './repositories/clinic-notification-channels.repository.interface'
import { ClinicNotificationChannelsRepository } from './repositories/clinic-notification-channels.repository'
import { DisableClinicNotificationChannelUseCase } from './use-cases/disable-clinic-notification-channel.use-case'
import { EnableClinicNotificationChannelUseCase } from './use-cases/enable-clinic-notification-channel.use-case'
import { FindClinicNotificationChannelsUseCase } from './use-cases/find-clinic-notification-channels.use-case'

@Module({
  imports: [TypeOrmModule.forFeature([ClinicNotificationChannel]), CacheModule, ClinicsModule],
  controllers: [ClinicNotificationChannelsController],
  providers: [
    FindClinicNotificationChannelsUseCase,
    EnableClinicNotificationChannelUseCase,
    DisableClinicNotificationChannelUseCase,
    { provide: IClinicNotificationChannelsRepository, useClass: ClinicNotificationChannelsRepository },
  ],
})
export class ClinicNotificationChannelsModule {}
