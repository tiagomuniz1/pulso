import { Type } from 'class-transformer'
import { IsOptional, ValidateNested } from 'class-validator'
import { AddressDto, UpdatePatientDto } from '@app/shared'

/** Ver `CreatePatientRequestDto` — mesmo motivo. */
export class UpdatePatientRequestDto extends UpdatePatientDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  declare address?: AddressDto
}
