import { appointmentLabelsService } from '../services/appointment-labels.service'
import { toAppointmentLabelModel } from '../mappers/to-appointment-label-model.mapper'
import type { IUpdateAppointmentLabelInput } from '../types/appointment-label-input.types'
import type { IAppointmentLabelModel } from '../types/appointment-label-model.types'

export async function updateAppointmentLabelUseCase(
  id: string,
  input: IUpdateAppointmentLabelInput,
): Promise<IAppointmentLabelModel> {
  const dto = await appointmentLabelsService.update(id, input)
  return toAppointmentLabelModel(dto)
}
