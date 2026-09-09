import type { CreateMedicalRecordDto } from '@app/shared'
import type { ICreateMedicalRecordInput } from '../types/medical-record-input.types'

export function toCreateMedicalRecordDto(input: ICreateMedicalRecordInput): CreateMedicalRecordDto {
  const dto: CreateMedicalRecordDto = {
    appointmentId: input.appointmentId,
    templateId: input.templateId,
    data: input.data,
  }
  if (input.notes !== undefined) dto.notes = input.notes
  return dto
}
