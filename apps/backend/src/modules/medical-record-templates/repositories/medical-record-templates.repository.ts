import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CouncilType } from '@app/shared'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import {
  IMedicalRecordTemplatesRepository,
  TemplateReadScope,
} from './medical-record-templates.repository.interface'

@Injectable()
export class MedicalRecordTemplatesRepository implements IMedicalRecordTemplatesRepository {
  constructor(
    @InjectRepository(MedicalRecordTemplate)
    private readonly repository: Repository<MedicalRecordTemplate>,
  ) {}

  async findAll(
    clinicId: string,
    page: number,
    limit: number,
    specialtyId?: string,
    generalist?: boolean,
    councilType?: CouncilType,
    scope?: TemplateReadScope,
    isActive?: boolean,
  ): Promise<[MedicalRecordTemplate[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder('template')
      .where('template.clinicId = :clinicId', { clinicId })

    // Recorte de leitura do profissional: as especialidades que ele exerce mais
    // o generalista da profissão dele. Aplicado aqui, e não depois de buscar,
    // para o total da paginação bater com o que ele enxerga.
    if (scope) {
      const temEspecialidades = scope.specialtyIds.length > 0
      if (temEspecialidades && scope.councilType) {
        queryBuilder.andWhere(
          '(template.specialtyId IN (:...scopeSpecialtyIds) OR (template.specialtyId IS NULL AND template.councilType = :scopeCouncilType))',
          { scopeSpecialtyIds: scope.specialtyIds, scopeCouncilType: scope.councilType },
        )
      } else if (temEspecialidades) {
        queryBuilder.andWhere('template.specialtyId IN (:...scopeSpecialtyIds)', {
          scopeSpecialtyIds: scope.specialtyIds,
        })
      } else if (scope.councilType) {
        queryBuilder.andWhere(
          '(template.specialtyId IS NULL AND template.councilType = :scopeCouncilType)',
          { scopeCouncilType: scope.councilType },
        )
      } else {
        // Sem especialidade e sem conselho não há escopo algum: melhor nada do
        // que o catálogo inteiro.
        queryBuilder.andWhere('1 = 0')
      }
    }

    if (generalist || councilType) {
      queryBuilder.andWhere('template.specialtyId IS NULL')
      if (councilType) {
        queryBuilder.andWhere('template.councilType = :councilType', { councilType })
      }
    } else if (specialtyId) {
      queryBuilder.andWhere('template.specialtyId = :specialtyId', { specialtyId })
    }

    // Sem default de propósito: a gestão precisa enxergar os desativados para
    // reativá-los, e o seletor da consulta pede `isActive=true` explicitamente.
    if (isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { isActive })
    }

    return queryBuilder
      .orderBy('template.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<MedicalRecordTemplate | null> {
    return this.repository.findOneBy({ id, clinicId })
  }

  async create(
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    return repo.save(repo.create({ ...data, clinicId }))
  }

  async update(
    id: string,
    data: Partial<MedicalRecordTemplate>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<MedicalRecordTemplate> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    const template = await repo.findOneByOrFail({ id, clinicId })
    Object.assign(template, data)
    return repo.save(template)
  }

  async delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(MedicalRecordTemplate)
      : this.repository
    await repo.softDelete({ id, clinicId })
  }
}
