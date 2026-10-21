import { CouncilType, COUNCIL_TYPE_PROFESSION_LABELS } from '@app/shared'
import type { ITemplateModel } from '../types/template-model.types'

/**
 * Especialidade só existe para Medicina (CRM) — um modelo de especialidade não
 * carrega councilType próprio, então a profissão dele é sempre CRM. Os demais
 * trazem a profissão diretamente.
 */
export function professionLabel(template: ITemplateModel): string {
  const councilType = template.specialtyId ? CouncilType.CRM : template.councilType
  return councilType ? COUNCIL_TYPE_PROFESSION_LABELS[councilType] : '—'
}

/**
 * Modelo sem especialidade é o generalista da profissão — nomeá-lo assim, em vez
 * de exibir um travessão, é o que separa "vale para a profissão inteira" de
 * "faltou preencher".
 */
export function specialtyLabel(template: ITemplateModel): string {
  return template.specialtyName ?? 'Generalista'
}
