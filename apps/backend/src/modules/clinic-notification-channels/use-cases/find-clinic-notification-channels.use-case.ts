import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicNotificationChannelResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'

@Injectable()
export class FindClinicNotificationChannelsUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly channelsRepository: IClinicNotificationChannelsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string): Promise<ClinicNotificationChannelResponseDto[]> {
    // 404s when the clinic does not exist, so a typo in the URL is not an empty list.
    await this.findClinicByIdUseCase.execute(clinicId)

    const records = await this.channelsRepository.findByClinicId(clinicId)

    return records.map((record) => this.toResponse(record))
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
