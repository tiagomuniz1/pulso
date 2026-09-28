import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { DayOfWeek } from '@app/shared'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class ListSchedulesQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activeOn?: string

  // Agenda encerrada some da listagem por padrão. A importação do IClinic
  // criou sete agendas legado por profissional só para ancorar o histórico,
  // e elas afogavam as agendas em vigor na tela de configuração.
  //
  // `@Transform`, não `@Type(() => Boolean)`: este converteria a string
  // 'false' em `true`.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeExpired?: boolean
}
