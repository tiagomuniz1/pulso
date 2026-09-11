import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class AppointmentLabelListQueryDto extends PaginationDto {
  // Sem default: a gestão precisa dos desativados para reativá-los; o seletor da
  // consulta pede `isActive=true`.
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true'))
  @IsBoolean()
  isActive?: boolean
}
