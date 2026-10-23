jest.mock('../services/appointments.service')

import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { setAppointmentLabelUseCase } from './set-appointment-label.use-case'

const mockService = appointmentsService as jest.Mocked<typeof appointmentsService>

const dto = {
  id: 'appt-uuid',
  professionalId: 'doc-uuid',
  professionalName: 'Dra. Ana',
  patientId: 'pat-uuid',
  patientName: 'Maria Silva',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sch-uuid',
  date: '2026-03-10',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  label: { id: 'label-uuid', name: 'Retorno', color: AppointmentLabelColor.MUSTARD },
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
} as never

describe('setAppointmentLabelUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('marks the label and returns the mapped appointment', async () => {
    mockService.setLabel.mockResolvedValue(dto)

    const result = await setAppointmentLabelUseCase('appt-uuid', 'label-uuid')

    expect(mockService.setLabel).toHaveBeenCalledWith('appt-uuid', 'label-uuid')
    expect(result.label).toEqual({
      id: 'label-uuid',
      name: 'Retorno',
      color: AppointmentLabelColor.MUSTARD,
    })
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('clears the label with null', async () => {
    mockService.setLabel.mockResolvedValue({ ...(dto as object), label: null } as never)

    const result = await setAppointmentLabelUseCase('appt-uuid', null)

    expect(mockService.setLabel).toHaveBeenCalledWith('appt-uuid', null)
    expect(result.label).toBeNull()
  })
})
