import { COUNCIL_REGISTRATION_FORMATS, CouncilType } from '@app/shared'
import type { IProfessionalRegistrationInput, IProfessionalSpecialtyInput } from '@app/core'

export interface IProfessionalFormValues {
  userMode: 'new' | 'existing'
  userId: string
  fullName: string
  email: string
  registrations: IProfessionalRegistrationInput[]
  specialties: IProfessionalSpecialtyInput[]
  bio: string
  isActive: boolean
}

export type ProfessionalFormErrors = Partial<Record<string, string>>

const STATE = /^[A-Z]{2}$/
const REGISTRY_NUMBER = /^\d{1,10}$/
const BIO_MAX_LENGTH = 500

/**
 * O número do registro tem formato por conselho.
 *
 * CRM aceita até seis dígitos, CRN até oito, CREFITO usa letra — a tabela
 * está no `@app/shared` e é a mesma que a web consulta. Validar com uma
 * regra só deixaria passar registro impossível e recusaria registro válido.
 */
export function isRegistrationValid(registration: IProfessionalRegistrationInput): boolean {
  const format = COUNCIL_REGISTRATION_FORMATS[registration.councilType]
  return format.numberPattern.test(registration.number) && STATE.test(registration.state)
}

/** Recorta e normaliza o que a pessoa digita no número do registro. */
export function applyRegistrationNumberMask(value: string, councilType: CouncilType): string {
  const format = COUNCIL_REGISTRATION_FORMATS[councilType]
  return value
    .toUpperCase()
    .replace(/[^0-9A-Z/-]/g, '')
    .slice(0, format.numberMaxLength)
}

/**
 * **RQE é exclusivo do CRM.** O número de qualificação de especialista só
 * existe na medicina, e pedi-lo a um nutricionista seria pedir um dado que
 * não existe.
 */
export function showsRegistryNumber(registrations: IProfessionalRegistrationInput[]): boolean {
  return registrations.find((registration) => registration.isPrimary)?.councilType === CouncilType.CRM
}

export function validateProfessionalForm(
  values: IProfessionalFormValues,
  isEditing: boolean,
): ProfessionalFormErrors {
  const errors: ProfessionalFormErrors = {}

  if (!isEditing) {
    if (values.userMode === 'existing') {
      if (!values.userId) errors.userId = 'Selecione um usuário'
    } else {
      if (values.fullName.trim().length < 3) errors.fullName = 'Nome deve ter no mínimo 3 caracteres'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'E-mail inválido'
    }
  }

  if (values.registrations.length === 0) {
    errors.registrations = 'Informe ao menos um registro profissional'
  } else if (!values.registrations.every(isRegistrationValid)) {
    errors.registrations = 'Preencha número e UF de todos os registros no formato esperado'
  }

  const hasInvalidRegistryNumber = values.specialties.some(
    (specialty) => specialty.registryNumber && !REGISTRY_NUMBER.test(specialty.registryNumber),
  )
  if (hasInvalidRegistryNumber) errors.specialties = 'RQE deve conter apenas dígitos'

  if (values.bio.length > BIO_MAX_LENGTH) {
    errors.bio = `Bio deve ter no máximo ${BIO_MAX_LENGTH} caracteres`
  }

  return errors
}
