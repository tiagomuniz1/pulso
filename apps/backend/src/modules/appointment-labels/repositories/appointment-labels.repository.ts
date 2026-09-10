import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryRunner, Repository } from 'typeorm'
import { AppointmentLabel } from '../entities/appointment-label.entity'
import { IAppointmentLabelsRepository } from './appointment-labels.repository.interface'

@Injectable()
export class AppointmentLabelsRepository implements IAppointmentLabelsRepository {
  constructor(
    @InjectRepository(AppointmentLabel)
    private readonly repository: Repository<AppointmentLabel>,
  ) {}

  async findAll(
    clinicId: string,
    page: number,
    limit: number,
    isActive?: boolean,
  ): Promise<[AppointmentLabel[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder('label')
      .where('label.clinicId = :clinicId', { clinicId })

    // Sem default: a gestão precisa enxergar os desativados para reativá-los, e
    // o seletor da consulta pede `isActive=true` explicitamente.
    if (isActive !== undefined) {
      queryBuilder.andWhere('label.isActive = :isActive', { isActive })
    }

    return queryBuilder
      .orderBy('label.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<AppointmentLabel | null> {
    return this.repository.findOneBy({ id, clinicId })
  }

  async findByIds(ids: string[], clinicId: string): Promise<AppointmentLabel[]> {
    if (ids.length === 0) return []
    return this.repository.findBy({ id: In(ids), clinicId })
  }

  async create(
    data: Partial<AppointmentLabel>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<AppointmentLabel> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(AppointmentLabel)
      : this.repository
    return repo.save(repo.create({ ...data, clinicId }))
  }

  async update(
    id: string,
    data: Partial<AppointmentLabel>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<AppointmentLabel> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(AppointmentLabel)
      : this.repository
    const label = await repo.findOneByOrFail({ id, clinicId })
    Object.assign(label, data)
    return repo.save(label)
  }

  async delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(AppointmentLabel)
      : this.repository
    await repo.softDelete({ id, clinicId })
  }
}
