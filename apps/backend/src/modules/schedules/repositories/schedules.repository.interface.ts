import { QueryRunner } from 'typeorm'
import { CreateScheduleDto, DayOfWeek, UpdateScheduleDto } from '@app/shared'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { Schedule } from '../entities/schedule.entity'

/**
 * Os filtros da listagem mais a data de hoje, que o use-case calcula e o
 * repositório só compara. `today` fica fora do DTO de propósito: o
 * ValidationPipe roda com `forbidNonWhitelisted`, e um campo a mais no DTO
 * viraria um parâmetro que o cliente poderia mandar.
 */
export type ListSchedulesFilters = ListSchedulesQueryDto & { today: string }

export abstract class ISchedulesRepository {
  abstract findAll(filters: ListSchedulesFilters, clinicId: string): Promise<[Schedule[], number]>
  abstract findById(id: string, clinicId: string): Promise<Schedule | null>
  abstract findOverlapping(
    professionalId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    validFrom: string | null,
    validUntil: string | null,
    clinicId: string,
    excludeId?: string,
  ): Promise<Schedule | null>
  abstract create(data: CreateScheduleDto & { professionalId: string }, queryRunner?: QueryRunner): Promise<Schedule>
  abstract update(id: string, data: UpdateScheduleDto, queryRunner?: QueryRunner): Promise<Schedule>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
  abstract deleteAllByProfessionalId(professionalId: string, clinicId: string, queryRunner?: QueryRunner): Promise<void>
  abstract findActiveByProfessionalAndDate(professionalId: string, dayOfWeek: DayOfWeek, date: string, clinicId: string): Promise<Schedule[]>
}
