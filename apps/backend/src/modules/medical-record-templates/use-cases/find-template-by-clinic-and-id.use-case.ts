import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'

/**
 * A porta deste módulo para o de prontuários: carrega o modelo que o
 * profissional escolheu, escopado pela clínica.
 *
 * Substituiu o `FindTemplateByClinicAndSpecialtyUseCase`, cujo contrato — "o
 * modelo daquela especialidade", no singular — deixou de existir quando a
 * clínica passou a poder ter vários por escopo.
 *
 * **Não** é o `FindMedicalRecordTemplateByIdUseCase`, de propósito: aquele exige
 * `ICurrentUser` e aplica o recorte de leitura do profissional com semântica de
 * 403 — política de catálogo, que não pertence a um caminho de escrita —, além
 * de devolver DTO de resposta e ler de cache. Aqui devolve-se a entidade, porque
 * quem chama precisa de `fields` para o snapshot e de `specialtyId`,
 * `councilType` e `isActive` para validar; e sem cache, porque é lookup por
 * chave primária num caminho de escrita cujo resultado vira snapshot imutável.
 */
@Injectable()
export class FindTemplateByClinicAndIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, id: string): Promise<MedicalRecordTemplate | null> {
    return this.templatesRepository.findById(id, clinicId)
  }
}
