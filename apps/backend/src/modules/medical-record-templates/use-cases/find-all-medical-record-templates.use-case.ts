import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordTemplateResponseDto, PaginatedMedicalRecordTemplatesResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { MedicalRecordTemplateListQueryDto } from '../dto/medical-record-template-list-query.dto'
import { resolveProfessionalTemplateScope } from '../utils/resolve-professional-template-scope.util'
import { TemplateReadScope } from '../repositories/medical-record-templates.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'

@Injectable()
export class FindAllMedicalRecordTemplatesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllMedicalRecordTemplatesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: MedicalRecordTemplateListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordTemplatesResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page = 1, limit = 20, specialtyId, generalist, councilType } = query
    const filterKey = councilType ?? (generalist ? 'generalist' : specialtyId ?? 'all')

    // O modelo é da clínica, mas o profissional só consulta o que se aplica ao
    // trabalho dele: as especialidades que exerce e o generalista da própria
    // profissão. Gerir continua sendo do ADMIN.
    let scope: TemplateReadScope | undefined
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      scope = professional
        ? resolveProfessionalTemplateScope(professional)
        : { specialtyIds: [], councilType: null }
    }

    // O escopo entra na chave: sem isso o profissional leria o cache do ADMIN,
    // que contém o catálogo inteiro.
    const scopeKey = scope
      ? `${scope.specialtyIds.slice().sort().join('|') || 'none'}:${scope.councilType ?? 'none'}`
      : 'all'
    const cacheKey = `medical_record_templates:list:${clinicId}:${page}:${limit}:${filterKey}:${scopeKey}`

    try {
      const cached =
        await this.cacheService.get<PaginatedMedicalRecordTemplatesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', {
        context: FindAllMedicalRecordTemplatesUseCase.name,
      })
    }

    const [templates, total] = await this.templatesRepository.findAll(
      clinicId,
      page,
      limit,
      specialtyId,
      generalist,
      councilType,
      scope,
    )

    const specialtyIds = [
      ...new Set(
        templates
          .map((template) => template.specialtyId)
          .filter((id): id is string => id !== null),
      ),
    ]
    const specialties = await this.specialtiesRepository.findByIds(specialtyIds)
    const nameMap = new Map(specialties.map((specialty) => [specialty.id, specialty.name]))

    const result: PaginatedMedicalRecordTemplatesResponseDto = {
      data: templates.map((template) =>
        this.toResponse(
          template,
          template.specialtyId ? nameMap.get(template.specialtyId) ?? null : null,
        ),
      ),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', {
        context: FindAllMedicalRecordTemplatesUseCase.name,
      })
    }

    return result
  }

  private toResponse(
    template: MedicalRecordTemplate,
    specialtyName: string | null,
  ): MedicalRecordTemplateResponseDto {
    return {
      id: template.id,
      specialtyId: template.specialtyId,
      specialtyName,
      councilType: template.councilType,
      name: template.name,
      fields: template.fields,
      sections: template.sections,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }
  }
}
