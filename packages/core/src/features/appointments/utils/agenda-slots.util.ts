import { AppointmentStatus } from '@app/shared'
import type { IAgendaSlot } from '../types/appointment-model.types'

/**
 * A grade do dia: um horário por linha.
 *
 * Lógica pura, fora de qualquer hook, porque os dois clientes montam a mesma
 * grade a partir das mesmas duas listas — a disponibilidade e as consultas.
 * Estava dentro do hook da web, onde o app não alcançava.
 */
function pickSlot(candidates: IAgendaSlot[]): IAgendaSlot {
  const active = candidates.find(
    (s) =>
      s.appointment !== null &&
      s.appointment.status !== AppointmentStatus.CANCELLED,
  )
  if (active) return active

  const free = candidates.find((s) => s.appointment === null)
  if (free) return free

  return candidates[0]
}

export function mergeSlotsByStartTime(
  freeSlots: IAgendaSlot[],
  bookedSlots: IAgendaSlot[],
): IAgendaSlot[] {
  const byStartTime = new Map<string, IAgendaSlot[]>()

  for (const slot of [...freeSlots, ...bookedSlots]) {
    const group = byStartTime.get(slot.startTime)
    if (group) group.push(slot)
    else byStartTime.set(slot.startTime, [slot])
  }

  return [...byStartTime.values()]
    .map(pickSlot)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/**
 * Recorta a agenda pelo rótulo, DEPOIS do merge.
 *
 * Precisa ser aqui e não no `GET /appointments`: `pickSlot` prefere a consulta
 * ao horário livre, e não havendo consulta cai no livre. Se o filtro tirasse a
 * consulta do payload, o horário voltaria a aparecer como "Livre — clique para
 * agendar" por cima de uma consulta que existe, e a recepção agendaria em cima.
 * Um filtro visual causaria agendamento duplo.
 *
 * Os horários livres somem sob filtro: quem procura "Retorno" quer a lista
 * curta, não vinte linhas de "Livre" no meio.
 */
export function filterSlotsByLabel(
  slots: IAgendaSlot[],
  labelFilter?: string | null,
): IAgendaSlot[] {
  if (!labelFilter) return slots
  if (labelFilter === 'none') {
    return slots.filter((slot) => slot.appointment !== null && slot.appointment.label === null)
  }
  return slots.filter((slot) => slot.appointment?.label?.id === labelFilter)
}
