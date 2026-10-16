jest.mock('../services/vaccinations.service')

import { vaccinationsService } from '../services/vaccinations.service'
import { createVaccinationUseCase } from './create-vaccination.use-case'
import { deleteVaccinationUseCase } from './delete-vaccination.use-case'
import { listVaccinationsUseCase } from './list-vaccinations.use-case'

const mockService = vaccinationsService as jest.Mocked<typeof vaccinationsService>

const dto = {
  id: 'vac-1',
  vaccineName: 'Tríplice viral',
  appliedAt: '2026-04-12',
  createdAt: '2026-04-12T18:00:00.000Z',
} as never

describe('use-cases de vacinação', () => {
  beforeEach(() => jest.clearAllMocks())

  it('listVaccinations mapeia a página', async () => {
    mockService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 } as never)

    const result = await listVaccinationsUseCase({ patientId: 'pat-1' })

    expect(mockService.getAll).toHaveBeenCalledWith({ patientId: 'pat-1' })
    expect(result.total).toBe(1)
    expect(result.data[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('listVaccinations sobrevive a uma caderneta vazia', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as never)

    expect((await listVaccinationsUseCase({ patientId: 'pat-1' })).data).toEqual([])
  })

  it('createVaccination devolve a dose mapeada', async () => {
    mockService.create.mockResolvedValue(dto)

    const result = await createVaccinationUseCase({ vaccineId: 'v1' } as never)

    expect(mockService.create).toHaveBeenCalledWith({ vaccineId: 'v1' })
    expect(result.id).toBe('vac-1')
  })

  it('deleteVaccination não devolve nada', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await expect(deleteVaccinationUseCase('vac-1')).resolves.toBeUndefined()
    expect(mockService.remove).toHaveBeenCalledWith('vac-1')
  })
})
