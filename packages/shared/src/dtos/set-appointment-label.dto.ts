import { IsUUID, ValidateIf } from 'class-validator'

export class SetAppointmentLabelDto {
  /**
   * Chave obrigatória, valor `null` permitido: `null` é "desmarcar", uma
   * intenção explícita. Com `@IsOptional()` sozinho, ausência e `null` ficariam
   * indistinguíveis sob `whitelist: true`.
   */
  @ValidateIf((o) => o.labelId !== null)
  @IsUUID()
  labelId!: string | null
}
