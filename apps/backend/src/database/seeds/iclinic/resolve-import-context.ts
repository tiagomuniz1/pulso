import { DataSource } from 'typeorm'
import { CouncilType } from '@app/shared'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { ClinicSpecialty } from '../../../modules/clinic-specialties/entities/clinic-specialty.entity'
import { ProfessionalRegistration } from '../../../modules/professionals/entities/professional-registration.entity'
import { ProfessionalSpecialty } from '../../../modules/professionals/entities/professional-specialty.entity'
import { Professional } from '../../../modules/professionals/entities/professional.entity'
import { Specialty } from '../../../modules/specialties/entities/specialty.entity'
import { User } from '../../../modules/users/entities/user.entity'
import { ImportTargets } from './import-iclinic.types'

/**
 * Onde a carga vai pousar: as duas clínicas, os dois profissionais e as duas
 * especialidades.
 *
 * Tudo é resolvido **antes** de qualquer escrita e **falha alto** quando algo
 * não existe. Gravar consulta com `specialty_id` nulo porque a especialidade não
 * estava vinculada seria pior que parar: o prontuário depois não acharia modelo
 * compatível, e o defeito só apareceria semanas depois, no consultório.
 */

export interface ClinicTarget {
  clinicId: string
  clinicSlug: string
  professionalId: string
  professionalName: string
  specialtyId: string
  specialtyName: string
  councilType: CouncilType
}

export interface ImportContext {
  main: ClinicTarget
  orthopedics: ClinicTarget
}

const MAIN_SPECIALTY = 'Ginecologia e Obstetrícia'
const ORTHOPEDICS_SPECIALTY = 'Ortopedia e Traumatologia'

async function resolveTarget(
  dataSource: DataSource,
  clinicSlug: string,
  professionalEmail: string,
  specialtyName: string,
): Promise<ClinicTarget> {
  const clinic = await dataSource.getRepository(Clinic).findOneBy({ slug: clinicSlug })
  if (!clinic) throw new Error(`Clínica "${clinicSlug}" não encontrada`)

  const user = await dataSource
    .getRepository(User)
    .findOneBy({ email: professionalEmail, clinicId: clinic.id })
  if (!user) throw new Error(`Usuário "${professionalEmail}" não encontrado na clínica "${clinicSlug}"`)

  const professional = await dataSource.getRepository(Professional).findOneBy({ userId: user.id })
  if (!professional) throw new Error(`"${professionalEmail}" não tem ficha de profissional`)

  const specialty = await dataSource.getRepository(Specialty).findOneBy({ name: specialtyName })
  if (!specialty) throw new Error(`Especialidade "${specialtyName}" não existe no catálogo`)

  // Repositório, não SQL cru: `dataSource.query` não aplica o schema do tenant
  // e a tabela some quando o search_path não é o `public`.
  const linkedToClinic = await dataSource
    .getRepository(ClinicSpecialty)
    .findOneBy({ clinicId: clinic.id, specialtyId: specialty.id })
  if (!linkedToClinic) {
    throw new Error(`Especialidade "${specialtyName}" não está habilitada na clínica "${clinicSlug}"`)
  }

  const linkedToProfessional = await dataSource
    .getRepository(ProfessionalSpecialty)
    .findOneBy({ professionalId: professional.id, specialtyId: specialty.id })
  if (!linkedToProfessional) {
    throw new Error(`"${professionalEmail}" não exerce "${specialtyName}"`)
  }

  const registration = await dataSource.getRepository(ProfessionalRegistration).findOne({
    where: { professionalId: professional.id },
    order: { isPrimary: 'DESC' },
  })
  if (!registration) {
    throw new Error(`"${professionalEmail}" não tem registro de conselho`)
  }

  return {
    clinicId: clinic.id,
    clinicSlug: clinic.slug,
    professionalId: professional.id,
    professionalName: user.fullName,
    specialtyId: specialty.id,
    specialtyName: specialty.name,
    councilType: registration.councilType as CouncilType,
  }
}

export async function resolveImportContext(
  dataSource: DataSource,
  targets: ImportTargets,
): Promise<ImportContext> {
  const main = await resolveTarget(
    dataSource,
    targets.clinicSlug,
    targets.professionalEmail,
    MAIN_SPECIALTY,
  )
  const orthopedics = await resolveTarget(
    dataSource,
    targets.orthopedicsClinicSlug,
    targets.orthopedicsProfessionalEmail,
    ORTHOPEDICS_SPECIALTY,
  )

  if (main.clinicId === orthopedics.clinicId) {
    throw new Error('As duas clínicas de destino são a mesma — o acervo de ortopedia ficaria misturado')
  }

  return { main, orthopedics }
}
