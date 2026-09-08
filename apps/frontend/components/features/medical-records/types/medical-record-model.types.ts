import type { MedicalRecordFieldType } from '@app/shared'

export interface IRecordFieldModel {
  key: string
  label: string
  type: MedicalRecordFieldType
  required: boolean
  order: number
  options: { value: string; label: string }[] | null
  placeholder: string | null
  helpText: string | null
  sectionKey: string | null
}

export interface IMedicalRecordModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  professionalId: string
  professionalName: string
  specialtyId: string | null
  specialtyName: string | null
  /** Data e horário do atendimento. Consulta excluída não aparece no histórico. */
  appointmentDate: string
  appointmentStartTime: string
  schema: IRecordFieldModel[]
  data: Record<string, unknown>
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedMedicalRecordsModel {
  data: IMedicalRecordModel[]
  total: number
  page: number
  limit: number
}
