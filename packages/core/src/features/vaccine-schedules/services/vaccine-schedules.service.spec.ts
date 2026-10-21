jest.mock('../../../api/api-client.registry')

import { apiClient } from '../../../api/api-client.registry'
import { vaccineSchedulesService } from './vaccine-schedules.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

beforeEach(() => jest.clearAllMocks())

describe('vaccineSchedulesService', () => {
  it('getPatientStatus asks for that patient', async () => {
    mockApiClient.get.mockResolvedValue({ pending: [] })

    await vaccineSchedulesService.getPatientStatus('pat-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccine-schedules/patients/pat-1')
  })

  it('recordDecision posts the decision', async () => {
    mockApiClient.post.mockResolvedValue(undefined)

    await vaccineSchedulesService.recordDecision({ vaccineId: 'vac-1' } as never)

    expect(mockApiClient.post).toHaveBeenCalledWith('/vaccine-schedules/decisions', {
      vaccineId: 'vac-1',
    })
  })

  /**
   * Sem filtro vem o calendário inteiro; com ele, as regras de uma vacina
   * só. A query string tem de sumir quando não há filtro — um
   * `?vaccineId=undefined` chegaria ao backend como texto.
   */
  it.each([
    ['sem filtro', undefined, '/vaccine-schedules/rules'],
    ['com vacina', 'vac-1', '/vaccine-schedules/rules?vaccineId=vac-1'],
  ])('getRules %s', async (_caso, vaccineId, expected) => {
    mockApiClient.get.mockResolvedValue([])

    await vaccineSchedulesService.getRules(vaccineId)

    expect(mockApiClient.get).toHaveBeenCalledWith(expected)
  })

  it('createRule posts to the rules endpoint', async () => {
    mockApiClient.post.mockResolvedValue({ id: 'rule-1' })

    await vaccineSchedulesService.createRule({ vaccineId: 'vac-1' } as never)

    expect(mockApiClient.post).toHaveBeenCalledWith('/vaccine-schedules/rules', {
      vaccineId: 'vac-1',
    })
  })

  it('updateRule patches the rule', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'rule-1' })

    await vaccineSchedulesService.updateRule('rule-1', { doseNumber: 2 } as never)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/vaccine-schedules/rules/rule-1', {
      doseNumber: 2,
    })
  })

  it('deleteRule removes the rule', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await vaccineSchedulesService.deleteRule('rule-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/vaccine-schedules/rules/rule-1')
  })
})
