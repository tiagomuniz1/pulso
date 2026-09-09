import { Transform, Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'
import { MedicalRecordTemplateSectionDto } from './medical-record-template-section.dto'

export class UpdateMedicalRecordTemplateDto {
  @IsOptional()
  // Trimmed so what the unique index de-duplicates matches what is stored:
  // "Retorno" and "Retorno " are the same name to whoever reads the picker.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordTemplateFieldDto)
  fields?: MedicalRecordTemplateFieldDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordTemplateSectionDto)
  sections?: MedicalRecordTemplateSectionDto[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
