import { AppointmentLabelColor } from '../enums/appointment-label-color.enum'

export class AppointmentLabelResponseDto {
  id!: string
  name!: string
  color!: AppointmentLabelColor
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}

/**
 * A forma reduzida que viaja embutida na consulta. Só o que a agenda precisa
 * para pintar a faixa e nomear o rótulo — sem `isActive`, porque um rótulo
 * desativado continua colorindo as consultas que já o usam.
 */
export class AppointmentLabelSummaryDto {
  id!: string
  name!: string
  color!: AppointmentLabelColor
}
