import { useAppointments } from './use-appointments.hook'
import { useAvailability } from './use-availability.hook'
import { filterSlotsByLabel, mergeSlotsByStartTime, type IAgendaSlot } from '@app/core'

// Availability only withholds a slot while an appointment is SCHEDULED, so a
// cancelled, confirmed, completed or no-show appointment comes back as a free
// slot *and* as an appointment. Concatenating the two lists rendered the same
// time twice — one row offering "Livre — clique para agendar" and another right
// below it with the appointment — which reads as a double booking.
//
// One row per start time, then. The appointment wins, except when it is only a
// cancelled one and the slot is genuinely free again: there, the bookable slot is
// the useful row, and the cancellation stays visible in the appointment list and
// in the patient history. A cancelled appointment with no matching free slot (the
// schedule changed since) is still shown, so nothing disappears without a trace.
export function useDayAgenda(
  professionalId: string | null,
  date: string,
  labelFilter?: string | null,
): { slots: IAgendaSlot[]; isLoading: boolean; isError: boolean } {
  const isSelf = professionalId === 'self'
  const enabled = professionalId !== null

  const availabilityParams = enabled
    ? {
        professionalId: isSelf ? undefined : (professionalId ?? /* c8 ignore next */ undefined),
        date,
        professionalIdKey: isSelf ? 'self' : professionalId!,
      }
    : null

  const appointmentParams = enabled
    ? {
        professionalId: isSelf ? undefined : (professionalId ?? /* c8 ignore next */ undefined),
        from: date,
        to: date,
        limit: 100,
      }
    : undefined

  const availability = useAvailability(availabilityParams)
  const appointments = useAppointments(enabled ? appointmentParams : undefined)

  const isLoading =
    (enabled && availability.isLoading) || (enabled && appointments.isLoading)
  const isError =
    (enabled && availability.isError) || (enabled && appointments.isError)

  if (!enabled) {
    return { slots: [], isLoading: false, isError: false }
  }

  const freeSlots: IAgendaSlot[] = (availability.data ?? []).map((slot) => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    status: 'free',
    appointment: null,
  }))

  const bookedSlots: IAgendaSlot[] = (appointments.data?.data ?? []).map((apt) => ({
    startTime: apt.startTime,
    endTime: apt.endTime,
    status: 'booked',
    appointment: apt,
  }))

  const slots = filterSlotsByLabel(mergeSlotsByStartTime(freeSlots, bookedSlots), labelFilter)

  return { slots, isLoading, isError }
}
