import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import type { IAgendaSlot } from '../types/appointment-model.types'
import { filterSlotsByLabel, mergeSlotsByStartTime } from './agenda-slots.util'

const booked = (
  startTime: string,
  overrides: { id?: string; status?: AppointmentStatus; labelId?: string | null } = {},
): IAgendaSlot => ({
  startTime,
  endTime: '08:30',
  status: 'booked',
  appointment: {
    id: overrides.id ?? 'appt',
    status: overrides.status ?? AppointmentStatus.SCHEDULED,
    label:
      overrides.labelId === undefined || overrides.labelId === null
        ? null
        : { id: overrides.labelId, name: 'Retorno', color: AppointmentLabelColor.GREEN },
  } as never,
})

const free = (startTime: string): IAgendaSlot => ({
  startTime,
  endTime: '08:30',
  status: 'free',
  appointment: null,
})

/**
 * A regra que esta função existe para impedir: a disponibilidade só retém o
 * horário enquanto a consulta está SCHEDULED, então uma consulta cancelada,
 * concluída ou confirmada volta como horário **livre** e como consulta. Sem a
 * mesclagem, a mesma hora aparecia duas vezes — uma oferecendo "Livre, clique
 * para agendar" e outra logo abaixo com a consulta, o que se lê como
 * agendamento duplo.
 */
describe('mergeSlotsByStartTime', () => {
  it('devolve uma linha por horário, em ordem', () => {
    const result = mergeSlotsByStartTime([free('09:00'), free('08:00')], [booked('10:00')])

    expect(result.map((slot) => slot.startTime)).toEqual(['08:00', '09:00', '10:00'])
  })

  it('a consulta ativa vence o horário livre do mesmo minuto', () => {
    const result = mergeSlotsByStartTime([free('08:00')], [booked('08:00', { id: 'ativa' })])

    expect(result).toHaveLength(1)
    expect(result[0]?.appointment?.id).toBe('ativa')
  })

  // A cancelada não segura o horário: ali o útil é poder reagendar, e o
  // cancelamento segue visível na lista de consultas e no histórico.
  it('o horário livre vence a consulta cancelada', () => {
    const result = mergeSlotsByStartTime(
      [free('08:00')],
      [booked('08:00', { status: AppointmentStatus.CANCELLED })],
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.appointment).toBeNull()
  })

  // Sem horário livre correspondente — a agenda mudou desde então — ela fica,
  // para nada sumir sem rastro.
  it('a cancelada fica quando não há horário livre para ela', () => {
    const result = mergeSlotsByStartTime(
      [],
      [booked('08:00', { id: 'cancelada', status: AppointmentStatus.CANCELLED })],
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.appointment?.id).toBe('cancelada')
  })

  it.each([AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW])(
    'consulta %s também vence o horário livre',
    (status) => {
      const result = mergeSlotsByStartTime([free('08:00')], [booked('08:00', { status })])

      expect(result[0]?.appointment?.status).toBe(status)
    },
  )

  it('não inventa linha quando não há nada', () => {
    expect(mergeSlotsByStartTime([], [])).toEqual([])
  })
})

describe('filterSlotsByLabel', () => {
  const comRotulo = (id: string, labelId: string | null): IAgendaSlot => ({
    startTime: '08:00',
    endTime: '08:30',
    status: 'booked',
    appointment: {
      id,
      label: labelId ? { id: labelId, name: 'Retorno', color: AppointmentLabelColor.GREEN } : null,
    } as any,
  })
  const livre: IAgendaSlot = { startTime: '09:00', endTime: '09:30', status: 'free', appointment: null }

  it('returns everything when there is no filter', () => {
    const slots = [comRotulo('a', 'l1'), livre]

    expect(filterSlotsByLabel(slots, null)).toBe(slots)
    expect(filterSlotsByLabel(slots, undefined)).toBe(slots)
    expect(filterSlotsByLabel(slots, '')).toBe(slots)
  })

  it('keeps only the appointments carrying the chosen label', () => {
    const result = filterSlotsByLabel([comRotulo('a', 'l1'), comRotulo('b', 'l2'), livre], 'l1')

    expect(result).toHaveLength(1)
    expect(result[0]!.appointment!.id).toBe('a')
  })

  it('keeps only the unlabelled appointments under "none"', () => {
    const result = filterSlotsByLabel([comRotulo('a', 'l1'), comRotulo('b', null), livre], 'none')

    expect(result).toHaveLength(1)
    expect(result[0]!.appointment!.id).toBe('b')
  })

  // Quem filtra por "Retorno" quer a lista curta, não vinte linhas de "Livre".
  it('drops free slots while a filter is on', () => {
    expect(filterSlotsByLabel([livre], 'l1')).toHaveLength(0)
    expect(filterSlotsByLabel([livre], 'none')).toHaveLength(0)
  })

  // A regressão que justifica o filtro ser no cliente: se ele estivesse no
  // servidor, a consulta sumiria do payload e `pickSlot` cairia no slot livre —
  // o horário voltaria como "Livre" por cima de uma consulta que existe, e a
  // recepção agendaria em cima.
  it('never turns a hidden appointment back into a free slot', () => {
    const mesmoHorario: IAgendaSlot[] = [
      { startTime: '08:00', endTime: '08:30', status: 'free', appointment: null },
      comRotulo('ocupada', 'l1'),
    ]

    const merged = mergeSlotsByStartTime([mesmoHorario[0]!], [mesmoHorario[1]!])
    const result = filterSlotsByLabel(merged, 'outro-label')

    expect(result.some((slot) => slot.status === 'free')).toBe(false)
  })
})
