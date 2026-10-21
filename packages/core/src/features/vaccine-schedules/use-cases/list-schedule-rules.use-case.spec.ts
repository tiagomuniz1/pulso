jest.mock('../services/vaccine-schedules.service')

import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import { listScheduleRulesUseCase } from './list-schedule-rules.use-case'

describe('listScheduleRulesUseCase', () => {
  /**
   * `createdAt` chega como texto do JSON. Quem consome ordena e formata por
   * data — e `'2026-01-02' > '2026-10-01'` é falso como string e verdadeiro
   * como data, que é o tipo de divergência que passa despercebida.
   */
  it('converts createdAt to a Date', async () => {
    ;(vaccineSchedulesService.getRules as jest.Mock).mockResolvedValue([
      { id: 'rule-1', createdAt: '2026-10-20T10:00:00.000Z' },
    ])

    const [rule] = await listScheduleRulesUseCase()

    expect(rule.createdAt).toBeInstanceOf(Date)
    expect(rule.createdAt.toISOString()).toBe('2026-10-20T10:00:00.000Z')
  })

  it('passes the vaccine filter through', async () => {
    ;(vaccineSchedulesService.getRules as jest.Mock).mockResolvedValue([])

    await listScheduleRulesUseCase('vac-1')

    expect(vaccineSchedulesService.getRules).toHaveBeenCalledWith('vac-1')
  })

  it('an empty calendar is an empty list', async () => {
    ;(vaccineSchedulesService.getRules as jest.Mock).mockResolvedValue([])

    await expect(listScheduleRulesUseCase()).resolves.toEqual([])
  })
})
