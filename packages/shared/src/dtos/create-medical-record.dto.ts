import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateMedicalRecordDto {
  @IsUUID()
  appointmentId!: string

  /**
   * The template the professional chose. Required: a clinic may keep several
   * templates for the same specialty, so the server can no longer resolve one on
   * its own — any fallback would be an arbitrary pick frozen forever into
   * `templateSchemaSnapshot`. The appointment still decides the *scope*; this
   * decides which template within it.
   */
  @IsUUID()
  templateId!: string

  @IsObject()
  data!: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string
}
