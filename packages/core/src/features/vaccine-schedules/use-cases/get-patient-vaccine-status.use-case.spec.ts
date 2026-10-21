jest.mock('../services/vaccine-schedules.service')

import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import { getPatientVaccineStatusUseCase } from './get-patient-vaccine-status.use-case'

describe('getPatientVaccineStatusUseCase', () => {
  it('returns the status of that patient', async () => {
    const status = { ageInYears: 36, pending: [] }
    ;(vaccineSchedulesService.getPatientStatus as jest.Mock).mockResolvedValue(status)

    await expect(getPatientVaccineStatusUseCase('pat-1')).resolves.toBe(status)
    expect(vaccineSchedulesService.getPatientStatus).toHaveBeenCalledWith('pat-1')
  })

  it('propagates errors', async () => {
    const error = { status: 403, title: 'Forbidden', detail: 'x' }
    ;(vaccineSchedulesService.getPatientStatus as jest.Mock).mockRejectedValue(error)

    await expect(getPatientVaccineStatusUseCase('pat-1')).rejects.toEqual(error)
  })
})
