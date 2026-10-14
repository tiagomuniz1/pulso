import { useQuery } from '@tanstack/react-query'
import {
  filterSlotsByLabel,
  getAvailabilityUseCase,
  listAppointmentsUseCase,
  mergeSlotsByStartTime,
  type IAgendaSlot,
} from '@app/core'

interface DayAgenda {
  slots: IAgendaSlot[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Sem profissional escolhido as duas consultas ficam desabilitadas e o React
 * Query devolve `undefined` — então a grade sai vazia sozinha, sem o hook
 * precisar de um retorno antecipado que nenhuma tela alcança.
 */

/**
 * A grade do dia, igual à da web.
 *
 * Duas requisições e uma mesclagem: a disponibilidade dá os horários livres,
 * `/appointments` dá as consultas, e `mergeSlotsByStartTime` — que agora vive
 * no `@app/core` — resolve o conflito quando as duas devolvem o mesmo minuto.
 *
 * `'self'` é o profissional logado: o servidor já recorta por ele, então o
 * `professionalId` não vai na requisição. É como a web distingue "a minha
 * agenda" de "a agenda de fulano" sem o cliente precisar saber o próprio id.
 */
export function useDayAgenda(
  professionalId: string | null,
  date: string,
  labelFilter?: string | null,
): DayAgenda {
  const enabled = professionalId !== null
  const isSelf = professionalId === 'self'
  const scoped = isSelf ? undefined : (professionalId ?? undefined)

  const availability = useQuery({
    queryKey: ['availability', professionalId, date],
    queryFn: () => getAvailabilityUseCase({ professionalId: scoped, date }),
    enabled,
  })

  const appointments = useQuery({
    queryKey: ['appointments', 'day', professionalId, date],
    queryFn: () => listAppointmentsUseCase({ professionalId: scoped, from: date, to: date, limit: 100 }),
    enabled,
  })

  const freeSlots: IAgendaSlot[] = (availability.data ?? []).map((slot) => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'free',
    appointment: null,
  }))

  const bookedSlots: IAgendaSlot[] = (appointments.data?.data ?? []).map((appointment) => ({
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: 'booked',
    appointment,
  }))

  return {
    slots: filterSlotsByLabel(mergeSlotsByStartTime(freeSlots, bookedSlots), labelFilter),
    isLoading: availability.isLoading || appointments.isLoading,
    isError: availability.isError || appointments.isError,
    refetch: () => {
      void availability.refetch()
      void appointments.refetch()
    },
  }
}
