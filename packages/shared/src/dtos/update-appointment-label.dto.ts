import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { AppointmentLabelColor } from '../enums/appointment-label-color.enum'

export class UpdateAppointmentLabelDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string

  @IsOptional()
  @IsEnum(AppointmentLabelColor)
  color?: AppointmentLabelColor

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
