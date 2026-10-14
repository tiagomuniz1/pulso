jest.mock('../services/professionals.service')

import { CouncilType } from '@app/shared'
import { professionalsService } from '../services/professionals.service'
import { getMyProfessionalUseCase } from './get-my-professional.use-case'

const mockService = professionalsService as jest.Mocked<typeof professionalsService>

const dto = {
  id: 'prof-uuid',
  user: { id: 'user-uuid', fullName: 'Dra. Ana', email: 'ana@pulso.test', isActive: true },
  registrations: [
    { id: 'reg-uuid', councilType: CouncilType.CRM, number: '12345', state: 'PE', isPrimary: true },
  ],
  specialties: [],
  bio: null,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
} as never

describe('getMyProfessionalUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('devolve a ficha do usuário logado', async () => {
    mockService.getMine.mockResolvedValue(dto)

    const result = await getMyProfessionalUseCase()

    expect(mockService.getMine).toHaveBeenCalled()
    expect(result?.id).toBe('prof-uuid')
  })

  /**
   * Não ter ficha é resposta, não erro.
   *
   * É o ADMIN que administra sem atender — o eixo "cargo e ofício". Tratar o
   * `null` como falha faria a tela dele parecer quebrada em vez de
   * simplesmente não oferecer o que depende de exercício.
   */
  it('devolve null quando o usuário não tem ficha', async () => {
    mockService.getMine.mockResolvedValue(null)

    await expect(getMyProfessionalUseCase()).resolves.toBeNull()
  })
})
