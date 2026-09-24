import { Type } from 'class-transformer'
import { IsOptional, ValidateNested } from 'class-validator'
import { AddressDto, CreatePatientDto } from '@app/shared'

/**
 * Existe só para re-declarar o `@Type(() => AddressDto)` do lado do backend.
 * O metadata do class-transformer não atravessa de forma confiável a fronteira
 * do pacote `@app/shared`, e sem ele o `address` chega como objeto cru e o
 * `@ValidateNested` passa batido. Mesmo motivo de
 * `clinics/dto/create-clinic-request.dto.ts`.
 */
export class CreatePatientRequestDto extends CreatePatientDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  declare address?: AddressDto
}
