import { DataSource } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { FindAppointmentLabelsUseCase } from '../use-cases/find-appointment-labels.use-case'

const mockRepository: jest.Mocked<IAppointmentLabelsRepository> = {
  findAll: jest.fn(), findById: jest.fn(), findByIds: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
}
const mockCache = { get: jest.fn(), set: jest.fn() } as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }
const makeLabel = () => ({
  id: 'l1', clinicId, name: 'Retorno', color: AppointmentLabelColor.GREEN,
  isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
})

describe('FindAppointmentLabelsUseCase', () => {
  let useCase: FindAppointmentLabelsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAppointmentLabelsUseCase({} as DataSource, mockRepository, mockCache)
    mockCache.get.mockResolvedValue(null as any)
    mockCache.set.mockResolvedValue(undefined as any)
    mockRepository.findAll.mockResolvedValue([[makeLabel()] as any, 1])
  })

  it('returns the cached page without touching the repository', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCache.get.mockResolvedValue(cached as any)

    await expect(useCase.execute({} as any, currentUser)).resolves.toBe(cached)
    expect(mockRepository.findAll).not.toHaveBeenCalled()
  })

  it('queries the repository on a miss and caches for ten minutes', async () => {
    const result = await useCase.execute({} as any, currentUser)

    expect(mockRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, undefined)
    expect(result.total).toBe(1)
    expect(mockCache.set).toHaveBeenCalledWith(
      `appointment_labels:list:${clinicId}:1:20:any`,
      result,
      600,
    )
  })

  // Sem o isActive na chave, a lista "só ativos" do seletor da consulta e a
  // lista completa da gestão colidiriam na mesma entrada de cache.
  it('keeps the active-only listing on a cache key of its own', async () => {
    await useCase.execute({ isActive: true } as any, currentUser)

    expect(mockCache.get).toHaveBeenCalledWith(`appointment_labels:list:${clinicId}:1:20:true`)
    expect(mockRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, true)
  })

  it('survives a cache read failure', async () => {
    mockCache.get.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute({} as any, currentUser)).resolves.toBeDefined()
  })

  it('survives a cache write failure', async () => {
    mockCache.set.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute({} as any, currentUser)).resolves.toBeDefined()
  })
})
