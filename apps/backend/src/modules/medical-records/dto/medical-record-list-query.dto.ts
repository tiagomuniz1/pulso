import { IsOptional, IsUUID, ValidateIf } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class MedicalRecordListQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  patientId?: string

  @IsOptional()
  @IsUUID()
  professionalId?: string

  /**
   * Recorte por especialidade, usado pela aba de histórico da consulta.
   *
   * Aceita `'null'` literal de propósito: consulta sem especialidade
   * (generalista) gera prontuário com `specialty_id` nulo, e sem essa via o
   * cliente não teria como pedir exatamente esses — omitir o parâmetro
   * significaria "todas as especialidades", que é outra coisa.
   */
  @IsOptional()
  @ValidateIf((o) => o.specialtyId !== 'null')
  @IsUUID()
  specialtyId?: string

  /** A consulta atual não entra no próprio histórico. */
  @IsOptional()
  @IsUUID()
  excludeAppointmentId?: string
}
