import { QueryFailedError } from 'typeorm'

export const DB_UNIQUE_CONSTRAINTS = {
  USERS_EMAIL_PLATFORM_ADMIN: 'UQ_users_email_platform_admin',
  USERS_EMAIL_CLINIC: 'UQ_users_email_clinic',
  PROFESSIONAL_REGISTRATIONS: 'professional_registrations_council_number_state_clinic_active_unique',
  PROFESSIONALS_USER_ID: 'professionals_user_id_clinic_active_unique',
  PATIENTS_DOCUMENT: 'patients_document_number_clinic_active_unique',
  CLINICS_SLUG: 'clinics_slug_unique',
  TEMPLATE_CLINIC_SPECIALTY_NAME: 'UQ_template_clinic_specialty_name',
  TEMPLATE_CLINIC_COUNCIL_TYPE_NAME: 'UQ_template_clinic_council_type_name',
  APPOINTMENT_LABELS_CLINIC_NAME: 'UQ_appointment_labels_clinic_name',
} as const

export function isUniqueConstraintViolation(error: unknown, constraint: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as any).code === '23505' &&
    (error as any).constraint === constraint
  )
}

export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof QueryFailedError && (error as any).code === '23503'
}
