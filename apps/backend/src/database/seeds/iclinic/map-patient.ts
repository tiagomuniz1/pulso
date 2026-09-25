import { AddressDto, PatientGender } from '@app/shared'
import { IClinicPatientRow } from './iclinic-csv.parser'

/**
 * Paciente do IClinic → os dados que o Pulso grava (um `User` + um `Patient`).
 *
 * O que não tem para onde ir fica de fora explicitamente: estado civil (que o
 * IClinic gravou no campo `civil_name`, destinado ao nome civil), RG, CNS,
 * indicação, nacionalidade e naturalidade.
 */

export const EXTERNAL_SOURCE = 'iclinic'

/** Domínio dos e-mails sintetizados. Não recebe correio — e não precisa: o
 *  paciente nasce inativo e nunca faz login. */
const PLACEHOLDER_EMAIL_DOMAIN = 'importado.pulso.local'

export interface MappedPatient {
  externalId: string
  fullName: string
  email: string
  /** True quando o e-mail foi inventado — vai para o relatório. */
  emailIsPlaceholder: boolean
  documentNumber: string | null
  phoneNumber: string
  birthDate: string
  gender: PatientGender
  address: AddressDto | null
  /** Incompleto pelas regras do `AddressDto` — entra assim mesmo, e é reportado. */
  addressIsPartial: boolean
  dateAdded: string
}

export function mapGender(raw: string): PatientGender {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'f') return PatientGender.FEMALE
  if (value === 'm') return PatientGender.MALE
  return PatientGender.OTHER
}

/** `(83) 98640-4309` e `(83) 8881-5220` já casam com o contrato; o resto é
 *  normalizado a partir dos dígitos. */
export function mapPhoneNumber(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return (raw ?? '').trim()
}

export function mapDocumentNumber(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

export function placeholderEmail(externalId: string): string {
  return `iclinic-${externalId}@${PLACEHOLDER_EMAIL_DOMAIN}`
}

/**
 * Limpa o prefixo que o IClinic deixou em 37 logradouros — `Rua: Pedro
 * Melquiades`, `Rua:Adalto Gomes`.
 */
export function normalizeStreet(raw: string): string {
  return (raw ?? '')
    .replace(/^(\s*(?:rua|av|avenida|r|travessa|alameda|rodovia))\s*:\s*/i, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

const REQUIRED_ADDRESS_FIELDS = ['street', 'number', 'neighborhood', 'city', 'state', 'zipCode'] as const

export function mapAddress(row: IClinicPatientRow): { address: AddressDto | null; isPartial: boolean } {
  const candidate = {
    street: normalizeStreet(row.address),
    number: (row.number ?? '').trim(),
    complement: (row.complement ?? '').trim() || null,
    neighborhood: (row.neighborhood ?? '').trim(),
    city: (row.city ?? '').trim(),
    state: (row.state ?? '').trim().toUpperCase(),
    zipCode: (row.zip_code ?? '').trim(),
    country: (row.country ?? '').trim().toUpperCase() || 'BR',
  }

  const hasAnything = REQUIRED_ADDRESS_FIELDS.some((key) => candidate[key] !== '') || candidate.complement !== null
  if (!hasAnything) return { address: null, isPartial: false }

  const isPartial = REQUIRED_ADDRESS_FIELDS.some((key) => candidate[key] === '')
  return { address: candidate as AddressDto, isPartial }
}

export function mapPatient(row: IClinicPatientRow): MappedPatient {
  const email = (row.email ?? '').trim().toLowerCase()
  const { address, isPartial } = mapAddress(row)

  return {
    externalId: row.patient_id,
    fullName: (row.name ?? '').trim(),
    email: email || placeholderEmail(row.patient_id),
    emailIsPlaceholder: email === '',
    documentNumber: mapDocumentNumber(row.cpf),
    phoneNumber: mapPhoneNumber(row.mobile_phone || row.home_phone),
    birthDate: (row.birthdate ?? '').trim(),
    gender: mapGender(row.gender),
    address,
    addressIsPartial: isPartial,
    dateAdded: row.date_added ?? '',
  }
}

/** Nome comparável: sem acento, sem caixa, sem espaço duplo. */
export function normalizeName(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Resolve e-mails repetidos entre pacientes distintos: o cadastro mais antigo
 * fica com o e-mail real, os demais recebem placeholder. O índice
 * `UQ_users_email_clinic` não admite os dois, e escolher pelo `date_added`
 * mantém o e-mail com quem o usou primeiro.
 */
export function dedupeEmails(patients: MappedPatient[]): MappedPatient[] {
  const byEmail = new Map<string, MappedPatient>()

  for (const patient of [...patients].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded))) {
    const existing = byEmail.get(patient.email)
    if (!existing) {
      byEmail.set(patient.email, patient)
      continue
    }
    patient.email = placeholderEmail(patient.externalId)
    patient.emailIsPlaceholder = true
  }

  return patients
}
