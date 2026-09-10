import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'

@Injectable()
export class DeleteAppointmentLabelUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteAppointmentLabelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly labelsRepository: IAppointmentLabelsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const existing = await this.labelsRepository.findById(id, clinicId)
    if (!existing) throw new NotFoundException('Label not found')

    // Soft delete, e `appointments.label_id` NÃO é zerado: mantendo o id,
    // restaurar o rótulo devolve a cor a todas as consultas de uma vez. O
    // TypeORM já filtra `deleted_at IS NULL`, então a resolução do rótulo passa
    // a devolver null sozinha e a consulta some da agenda colorida.
    await this.labelsRepository.delete(id, clinicId)

    try {
      await this.cacheService.del(`appointment_label:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`appointment_labels:list:${clinicId}*`)
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: DeleteAppointmentLabelUseCase.name,
      })
    }
  }
}
