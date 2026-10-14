jest.mock('../services/vaccines.service')

import { vaccinesService } from '../services/vaccines.service'
import { createVaccineUseCase } from './create-vaccine.use-case'
import { deleteVaccineUseCase } from './delete-vaccine.use-case'
import { getVaccineUseCase } from './get-vaccine.use-case'
import { listVaccinesUseCase } from './list-vaccines.use-case'
import { updateVaccineUseCase } from './update-vaccine.use-case'

const mockService = vaccinesService as jest.Mocked<typeof vaccinesService>

const dto = {
  id: 'v1',
  name: 'Tríplice viral',
  abbreviation: 'SCR',
  preventedDiseases: ['Sarampo'],
  isActive: true,
  createdAt: '2026-01-10T10:00:00.000Z',
} as never

describe('use-cases de vacina', () => {
  beforeEach(() => jest.clearAllMocks())

  it('listVaccines mapeia a página', async () => {
    mockService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 } as never)

    const result = await listVaccinesUseCase({ search: 'tríplice' })

    expect(mockService.getAll).toHaveBeenCalledWith({ search: 'tríplice' })
    expect(result.data[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('listVaccines funciona sem parâmetro', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as never)

    expect((await listVaccinesUseCase()).data).toEqual([])
    expect(mockService.getAll).toHaveBeenCalledWith(undefined)
  })

  it('getVaccine devolve uma mapeada', async () => {
    mockService.getById.mockResolvedValue(dto)

    expect((await getVaccineUseCase('v1')).name).toBe('Tríplice viral')
  })

  it('createVaccine devolve a criada', async () => {
    mockService.create.mockResolvedValue(dto)

    expect((await createVaccineUseCase({ name: 'Tríplice viral' } as never)).id).toBe('v1')
  })

  // Desativar é "pare de usar em coisas novas", não "tire da minha clínica".
  it('updateVaccine repassa o que mudou', async () => {
    mockService.update.mockResolvedValue({ ...(dto as object), isActive: false } as never)

    const result = await updateVaccineUseCase('v1', { isActive: false } as never)

    expect(mockService.update).toHaveBeenCalledWith('v1', { isActive: false })
    expect(result.isActive).toBe(false)
  })

  it('deleteVaccine não devolve nada', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await expect(deleteVaccineUseCase('v1')).resolves.toBeUndefined()
  })
})
