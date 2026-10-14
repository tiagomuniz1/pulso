import { appointmentLabelsService } from '../services/appointment-labels.service'
import { toPaginatedAppointmentLabelsModel } from '../mappers/to-appointment-label-model.mapper'
import type {
  IAppointmentLabelListParams,
  IPaginatedAppointmentLabelsModel,
} from '../types/appointment-label-model.types'

export async function listAppointmentLabelsUseCase(
  params?: IAppointmentLabelListParams,
): Promise<IPaginatedAppointmentLabelsModel> {
  const dto = await appointmentLabelsService.getAll(params)
  return toPaginatedAppointmentLabelsModel(dto)
}
