import { AppointmentStatus } from '../enums/appointment-status.enum'

/**
 * As situações em que a consulta ainda está de pé.
 *
 * É o conjunto que o backend aceita concluir e cancelar — e o que decide se
 * a tela oferece essas ações. Vive aqui, e não repetido em cada camada,
 * porque foi exatamente a repetição que causou o defeito: a web gatilhava
 * só em `SCHEDULED` e escondia os botões de uma consulta **confirmada** que
 * o backend concluiria sem reclamar. O app usava o conjunto certo, e as
 * duas telas discordavam sobre a mesma consulta.
 *
 * Trocar o profissional **não** entra: ali o backend exige `SCHEDULED`, e é
 * outra regra — remanejar uma consulta que a paciente já confirmou é mudar
 * o combinado, não corrigir um agendamento.
 */
export const OPEN_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
]

/** Se a consulta ainda pode ser concluída ou cancelada. */
export function isAppointmentOpen(status: AppointmentStatus): boolean {
  return OPEN_APPOINTMENT_STATUSES.includes(status)
}
