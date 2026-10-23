import { AppointmentStatus } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS } from './appointment-model.types'

describe('APPOINTMENT_STATUS_LABELS', () => {
  // `Record<AppointmentStatus, string>` já obriga a cobrir todos em tempo de
  // compilação — mas um status novo entraria aqui como string vazia sem o
  // compilador reclamar, e a agenda mostraria uma consulta sem situação.
  it('has a non-empty label for every status', () => {
    const statuses = Object.values(AppointmentStatus)

    expect(Object.keys(APPOINTMENT_STATUS_LABELS).sort()).toEqual([...statuses].sort())
    statuses.forEach((status) => expect(APPOINTMENT_STATUS_LABELS[status]).toBeTruthy())
  })
})
