import { AppointmentStatus } from '../enums/appointment-status.enum'
import { OPEN_APPOINTMENT_STATUSES, isAppointmentOpen } from './appointment-status.config'

describe('isAppointmentOpen', () => {
  it.each([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])(
    '%s ainda está de pé',
    (status) => {
      expect(isAppointmentOpen(status)).toBe(true)
    },
  )

  it.each([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW])(
    '%s está encerrada',
    (status) => {
      expect(isAppointmentOpen(status)).toBe(false)
    },
  )

  /**
   * Uma situação nova que ninguém classificasse cairia em "encerrada" por
   * omissão — o que esconde as ações em vez de oferecer um caminho que
   * termina em erro. É o lado seguro, mas tem de ser escolha, não descuido.
   */
  it('classifica todo o enum', () => {
    const encerradas = Object.values(AppointmentStatus).filter(
      (status) => !OPEN_APPOINTMENT_STATUSES.includes(status),
    )

    expect(OPEN_APPOINTMENT_STATUSES.length + encerradas.length).toBe(
      Object.values(AppointmentStatus).length,
    )
  })
})
