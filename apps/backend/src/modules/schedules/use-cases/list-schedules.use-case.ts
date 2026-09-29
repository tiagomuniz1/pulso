import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedSchedulesResponseDto, ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { Schedule } from '../entities/schedule.entity'

const BRAZIL_UTC_OFFSET_IN_MILLISECONDS = 3 * 60 * 60 * 1000

@Injectable()
export class ListSchedulesUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListSchedulesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: ListSchedulesQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedSchedulesResponseDto> {
    const clinicId = currentUser.clinicId!
    const effectiveQuery = { ...query }

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      effectiveQuery.professionalId = professional.id
    }

    const { professionalId, dayOfWeek, activeOn, includeExpired, page = 1, limit = 20 } = effectiveQuery

    // Hoje no fuso da clínica. O Brasil é sempre UTC-3 (horário de verão
    // abolido em 2019), como em create-appointment.use-case.ts. Usar a data em
    // UTC esconderia, entre 21h e a meia-noite de Brasília, uma agenda que
    // ainda vale.
    const today = new Date(Date.now() - BRAZIL_UTC_OFFSET_IN_MILLISECONDS).toISOString().slice(0, 10)

    const cacheKey = `schedules:list:${clinicId}:${professionalId ?? 'all'}:${dayOfWeek ?? 'all'}:${activeOn ?? 'all'}:${includeExpired === true}:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedSchedulesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListSchedulesUseCase.name })
    }

    const [schedules, total] = await this.schedulesRepository.findAll(
      { ...effectiveQuery, today },
      clinicId,
    )

    const professionalIds = [...new Set(schedules.map((s) => s.professionalId))]
    const professionalNames = await this.fetchProfessionalNames(professionalIds)

    const result: PaginatedSchedulesResponseDto = {
      data: schedules.map((s) => this.toResponse(s, professionalNames.get(s.professionalId) ?? '')),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: ListSchedulesUseCase.name })
    }

    return result
  }

  private async fetchProfessionalNames(professionalIds: string[]): Promise<Map<string, string>> {
    if (professionalIds.length === 0) return new Map()
    const rows: Array<{ professionalId: string; fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('d.id', 'professionalId')
      .addSelect('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id IN (:...ids)', { ids: professionalIds })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.professionalId, r.fullName]))
  }

  private toResponse(schedule: Schedule, professionalName: string): ScheduleResponseDto {
    return {
      id: schedule.id,
      professionalId: schedule.professionalId,
      professionalName,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotDurationInMinutes: schedule.slotDurationInMinutes,
      validFrom: schedule.validFrom,
      validUntil: schedule.validUntil,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    }
  }
}
