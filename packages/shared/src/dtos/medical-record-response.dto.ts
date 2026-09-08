import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'

export class MedicalRecordResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  professionalId!: string
  professionalName!: string
  specialtyId!: string | null
  specialtyName!: string | null
  /** Data e horário do ATENDIMENTO, não do registro. Nulos se a consulta foi excluída. */
  appointmentDate!: string | null
  appointmentStartTime!: string | null
  templateId!: string
  templateSchemaSnapshot!: MedicalRecordTemplateFieldDto[]
  data!: Record<string, unknown>
  notes!: string | null
  createdAt!: Date
  updatedAt!: Date
}
