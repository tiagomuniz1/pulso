import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { GetAppointmentLabelUseCase } from '../use-cases/get-appointment-label.use-case'

const mockRepository: jest.Mocked<IAppointmentLabelsRepository> = {
  findAll: jest.fn(), findById: jest.fn(), findByIds: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
}
const mockCache = { get: jest.fn(), set: jest.fn() } as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

describe('GetAppointmentLabelUseCase', () => {
  let useCase: GetAppointmentLabelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetAppointmentLabelUseCase({} as DataSource, mockRepository, mockCache)
    mockCache.get.mockResolvedValue(null as any)
    mockCache.set.mockResolvedValue(undefined as any)
  })

  it('throws NotFound for a label from another clinic', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('x', currentUser)).rejects.toThrow(NotFoundException)
  })

  it('returns and caches the label scoped by clinic', async () => {
    mockRepository.findById.mockResolvedValue({
      id: 'l1', clinicId, name: 'Retorno', color: AppointmentLabelColor.GREEN,
      isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    } as any)

    const result = await useCase.execute('l1', currentUser)

    expect(mockRepository.findById).toHaveBeenCalledWith('l1', clinicId)
    expect(result.name).toBe('Retorno')
    expect(mockCache.set).toHaveBeenCalledWith(`appointment_label:${clinicId}:l1`, result, 600)
  })

  it('survives cache failures on both read and write', async () => {
    mockCache.get.mockRejectedValue(new Error('down'))
    mockCache.set.mockRejectedValue(new Error('down'))
    mockRepository.findById.mockResolvedValue({
      id: 'l1', clinicId, name: 'R', color: AppointmentLabelColor.ROSE,
      isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    } as any)

    await expect(useCase.execute('l1', currentUser)).resolves.toBeDefined()
  })
})
