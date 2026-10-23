jest.mock('../services/vaccine-schedules.service')

import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import { recordVaccineDecisionUseCase } from './record-vaccine-decision.use-case'

describe('recordVaccineDecisionUseCase', () => {
  it('sends the decision as given', async () => {
    ;(vaccineSchedulesService.recordDecision as jest.Mock).mockResolvedValue(undefined)
    const input = { vaccineId: 'vac-1', decision: 'dispensed', reason: 'Contraindicação' }

    await recordVaccineDecisionUseCase(input as never)

    expect(vaccineSchedulesService.recordDecision).toHaveBeenCalledWith(input)
  })

  /**
   * Dispensar e adiar exigem motivo — a regra é do backend, que responde
   * `422`. O erro tem de chegar à tela: engoli-lo aqui faria o painel
   * mostrar a conduta registrada sobre nada.
   */
  it('propagates the refusal', async () => {
    const error = { status: 422, title: 'Unprocessable', detail: 'reason is required' }
    ;(vaccineSchedulesService.recordDecision as jest.Mock).mockRejectedValue(error)

    await expect(recordVaccineDecisionUseCase({} as never)).rejects.toEqual(error)
  })
})
