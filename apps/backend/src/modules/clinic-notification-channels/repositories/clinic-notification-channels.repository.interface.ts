import { QueryRunner } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'

export abstract class IClinicNotificationChannelsRepository {
  /**
   * Every channel enabled for the clinic. Not paginated: the list is bounded by
   * the NotificationChannel enum, so it can never grow past a handful.
   */
  abstract findByClinicId(clinicId: string): Promise<ClinicNotificationChannel[]>

  abstract findByClinicAndChannel(
    clinicId: string,
    channel: NotificationChannel,
  ): Promise<ClinicNotificationChannel | null>

  abstract enable(
    clinicId: string,
    channel: NotificationChannel,
    queryRunner?: QueryRunner,
  ): Promise<ClinicNotificationChannel>

  abstract disable(id: string, queryRunner?: QueryRunner): Promise<void>
}
