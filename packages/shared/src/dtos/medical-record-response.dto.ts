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
  /**
   * Data e horário do ATENDIMENTO, não do registro. Sempre presentes:
   * prontuário de consulta excluída não é devolvido.
   */
  appointmentDate!: string
  appointmentStartTime!: string
  templateId!: string
  templateSchemaSnapshot!: MedicalRecordTemplateFieldDto[]
  data!: Record<string, unknown>
  notes!: string | null
  createdAt!: Date
  updatedAt!: Date
}
