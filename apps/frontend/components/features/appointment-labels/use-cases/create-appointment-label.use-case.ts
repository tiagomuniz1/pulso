import { appointmentLabelsService } from '../services/appointment-labels.service'
import { toAppointmentLabelModel } from '../mappers/to-appointment-label-model.mapper'
import type { ICreateAppointmentLabelInput } from '../types/appointment-label-input.types'
import type { IAppointmentLabelModel } from '../types/appointment-label-model.types'

export async function createAppointmentLabelUseCase(
  input: ICreateAppointmentLabelInput,
): Promise<IAppointmentLabelModel> {
  const dto = await appointmentLabelsService.create({ name: input.name, color: input.color })
  return toAppointmentLabelModel(dto)
}
