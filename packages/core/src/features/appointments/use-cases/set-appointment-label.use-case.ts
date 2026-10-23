import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function setAppointmentLabelUseCase(
  id: string,
  labelId: string | null,
): Promise<IAppointmentModel> {
  const dto = await appointmentsService.setLabel(id, labelId)
  return toAppointmentModel(dto)
}
