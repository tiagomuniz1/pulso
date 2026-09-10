import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentLabelResponseDto, UpdateAppointmentLabelDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AppointmentLabel } from '../entities/appointment-label.entity'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { toAppointmentLabelResponse } from '../appointment-label.mapper'
import { toAppointmentLabelNameConflict } from '../utils/appointment-label-name-conflict.util'

@Injectable()
export class UpdateAppointmentLabelUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateAppointmentLabelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly labelsRepository: IAppointmentLabelsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: UpdateAppointmentLabelDto,
    currentUser: ICurrentUser,
  ): Promise<AppointmentLabelResponseDto> {
    const clinicId = currentUser.clinicId!

    const existing = await this.labelsRepository.findById(id, clinicId)
    if (!existing) throw new NotFoundException('Label not found')

    const updateData: Partial<AppointmentLabel> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.color !== undefined) updateData.color = dto.color
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive

    let updated: AppointmentLabel
    try {
      updated = await this.labelsRepository.update(id, updateData, clinicId)
    } catch (error) {
      throw toAppointmentLabelNameConflict(error)
    }

    await this.invalidate(clinicId, id)

    return toAppointmentLabelResponse(updated)
  }

  /**
   * Além do próprio catálogo, invalida as listas de consultas: o rótulo viaja
   * embutido no payload da consulta, então renomear ou recolorir muda o conteúdo
   * de tudo que está em cache — e a regra da casa é invalidar, não esperar TTL.
   */
  private async invalidate(clinicId: string, id: string): Promise<void> {
    try {
      await this.cacheService.del(`appointment_label:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`appointment_labels:list:${clinicId}*`)
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: UpdateAppointmentLabelUseCase.name,
      })
    }
  }
}
