import { useQuery } from '@tanstack/react-query'
import { listAppointmentsUseCase, type IAppointmentModel } from '@app/core'

/**
 * As consultas de um dia, em ordem de horário.
 *
 * A web mescla isto com os horários livres da agenda, porque lá se agenda. Aqui
 * não: quem abre o app está de pé entre uma paciente e outra e quer a fila do
 * dia, não a grade de agendamento. Vinte linhas de "Livre" entre os
 * atendimentos seriam ruído numa tela de seis polegadas.
 *
 * O recorte por profissional é do servidor: o PROFESSIONAL recebe só as
 * próprias consultas sem pedir, e o ADMIN recebe as da clínica inteira.
 */
export function useDayAppointments(date: string) {
  return useQuery({
    queryKey: ['appointments', 'day', date],
    queryFn: async (): Promise<IAppointmentModel[]> => {
      const page = await listAppointmentsUseCase({ from: date, to: date, limit: 100 })
      return [...page.data].sort((a, b) => a.startTime.localeCompare(b.startTime))
    },
  })
}
