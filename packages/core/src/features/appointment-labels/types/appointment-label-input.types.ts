import type { AppointmentLabelColor } from '@app/shared'

export interface ICreateAppointmentLabelInput {
  name: string
  color: AppointmentLabelColor
}

export interface IUpdateAppointmentLabelInput {
  name?: string
  color?: AppointmentLabelColor
  isActive?: boolean
}
