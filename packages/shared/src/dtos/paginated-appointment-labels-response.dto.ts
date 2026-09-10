import { AppointmentLabelResponseDto } from './appointment-label-response.dto'

export class PaginatedAppointmentLabelsResponseDto {
  data!: AppointmentLabelResponseDto[]
  total!: number
  page!: number
  limit!: number
}
