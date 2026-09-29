import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'
import { IClinicNotificationChannelsRepository } from './clinic-notification-channels.repository.interface'

@Injectable()
export class ClinicNotificationChannelsRepository implements IClinicNotificationChannelsRepository {
  constructor(
    @InjectRepository(ClinicNotificationChannel)
    private readonly repository: Repository<ClinicNotificationChannel>,
  ) {}

  async findByClinicId(clinicId: string): Promise<ClinicNotificationChannel[]> {
    return this.repository.find({ where: { clinicId }, order: { createdAt: 'ASC' } })
  }

  async findByClinicAndChannel(
    clinicId: string,
    channel: NotificationChannel,
  ): Promise<ClinicNotificationChannel | null> {
    return this.repository.findOneBy({ clinicId, channel })
  }

  async enable(
    clinicId: string,
    channel: NotificationChannel,
    queryRunner?: QueryRunner,
  ): Promise<ClinicNotificationChannel> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(ClinicNotificationChannel)
      : this.repository

    return repository.save(repository.create({ clinicId, channel }))
  }

  // Hard delete: disabling is the absence of the row, and this table is
  // configuration rather than an audit trail (same call as clinic_specialties).
  async disable(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(ClinicNotificationChannel)
      : this.repository

    await repository.delete(id)
  }
}
