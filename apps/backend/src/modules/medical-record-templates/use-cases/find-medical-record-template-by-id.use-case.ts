import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, MedicalRecordTemplateResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import {
  resolveProfessionalTemplateScope,
  templateIsInProfessionalScope,
} from '../utils/resolve-professional-template-scope.util'

@Injectable()
export class FindMedicalRecordTemplateByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicalRecordTemplateByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalRecordTemplateResponseDto> {
    const clinicId = currentUser.clinicId!
    const cacheKey = `medical_record_template:${clinicId}:${id}`

    let cached: MedicalRecordTemplateResponseDto | null = null
    try {
      cached = await this.cacheService.get<MedicalRecordTemplateResponseDto>(cacheKey)
    } catch {
      this.logger.warn('Cache read failed', {
        context: FindMedicalRecordTemplateByIdUseCase.name,
      })
    }

    // A checagem fica FORA do try do cache: a chave é por id, sem papel nenhum,
    // então voltar cedo entregaria ao profissional um modelo fora do escopo
    // dele. E dentro do try o Forbidden seria engolido pelo catch, que existe
    // para tolerar falha de cache — não para esconder negativa de acesso.
    if (cached) {
      await this.assertInScope(cached.specialtyId, cached.councilType, currentUser, clinicId)
      return cached
    }

    const template = await this.templatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Template not found')

    await this.assertInScope(template.specialtyId, template.councilType, currentUser, clinicId)

    const specialty = template.specialtyId
      ? await this.specialtiesRepository.findById(template.specialtyId)
      : null
    const response = this.toResponse(template, specialty?.name ?? null)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', {
        context: FindMedicalRecordTemplateByIdUseCase.name,
      })
    }

    return response
  }

  /**
   * O modelo é da clínica, mas o profissional só consulta o que se aplica ao
   * trabalho dele: as especialidades que exerce e o generalista da própria
   * profissão. O ADMIN não é recortado.
   */
  private async assertInScope(
    specialtyId: string | null,
    councilType: CouncilType | null,
    currentUser: ICurrentUser,
    clinicId: string,
  ): Promise<void> {
    if (currentUser.role !== UserRole.PROFESSIONAL) return

    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional) throw new ForbiddenException('Insufficient permissions')

    const scope = resolveProfessionalTemplateScope(professional)
    if (!templateIsInProfessionalScope(scope, specialtyId, councilType)) {
      throw new ForbiddenException('This template does not apply to your specialty')
    }
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
