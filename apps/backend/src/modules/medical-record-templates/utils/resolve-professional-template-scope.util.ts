import { CouncilType } from '@app/shared'
import { Professional } from '../../professionals/entities/professional.entity'
import { getPrimaryCouncilType } from '../../professionals/utils/get-primary-council-type.util'

export interface ProfessionalTemplateScope {
  /** Especialidades que o profissional exerce. */
  specialtyIds: string[]
  /** Profissão dele, que dá acesso ao modelo generalista correspondente. */
  councilType: CouncilType | null
}

/**
 * O que um profissional enxerga do catálogo de modelos da clínica.
 *
 * Modelo de prontuário é **da clínica**, não do profissional — a tabela
 * `medical_record_templates` não tem `professional_id`, e dois médicos da mesma
 * especialidade compartilham o mesmo modelo. Por isso gerir é do ADMIN, e ao
 * profissional cabe apenas consultar o que se aplica ao trabalho dele: as
 * especialidades que exerce e o generalista da própria profissão.
 */
export function resolveProfessionalTemplateScope(
  professional: Professional,
): ProfessionalTemplateScope {
  return {
    specialtyIds: (professional.professionalSpecialties ?? []).map((ps) => ps.specialtyId),
    councilType: getPrimaryCouncilType(professional),
  }
}

/** Se um modelo cai no escopo de leitura do profissional. */
export function templateIsInProfessionalScope(
  scope: ProfessionalTemplateScope,
  specialtyId: string | null,
  councilType: CouncilType | null,
): boolean {
  if (specialtyId) return scope.specialtyIds.includes(specialtyId)
  // Generalista: vale para quem exerce aquela profissão.
  return councilType !== null && councilType === scope.councilType
}
