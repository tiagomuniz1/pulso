import { appointmentLabelsService } from '../services/appointment-labels.service'

export async function deleteAppointmentLabelUseCase(id: string): Promise<void> {
  await appointmentLabelsService.remove(id)
}
