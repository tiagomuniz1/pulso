import { Transform } from 'class-transformer'
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator'
import { AppointmentLabelColor } from '../enums/appointment-label-color.enum'

export class CreateAppointmentLabelDto {
  // Trimmed para o que o índice único deduplica bater com o que é gravado.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string

  @IsEnum(AppointmentLabelColor)
  color!: AppointmentLabelColor
}
