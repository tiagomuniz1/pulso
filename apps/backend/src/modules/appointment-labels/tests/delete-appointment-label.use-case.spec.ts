import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { DeleteAppointmentLabelUseCase } from '../use-cases/delete-appointment-label.use-case'

const mockRepository: jest.Mocked<IAppointmentLabelsRepository> = {
  findAll: jest.fn(), findById: jest.fn(), findByIds: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
}
const mockCache = {
  del: jest.fn(), delByPattern: jest.fn(), delByPrefix: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

describe('DeleteAppointmentLabelUseCase', () => {
  let useCase: DeleteAppointmentLabelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteAppointmentLabelUseCase({} as DataSource, mockRepository, mockCache)
    mockRepository.findById.mockResolvedValue({ id: 'label-uuid', clinicId, color: AppointmentLabelColor.ROSE } as any)
    mockCache.del.mockResolvedValue(undefined as any)
    mockCache.delByPattern.mockResolvedValue(undefined as any)
    mockCache.delByPrefix.mockResolvedValue(undefined as any)
  })

  it('throws NotFound for a label from another clinic', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('x', currentUser)).rejects.toThrow(NotFoundException)
    expect(mockRepository.delete).not.toHaveBeenCalled()
  })

  it('soft deletes scoped to the clinic', async () => {
    await useCase.execute('label-uuid', currentUser)

    expect(mockRepository.delete).toHaveBeenCalledWith('label-uuid', clinicId)
  })

  it('invalidates the appointment listings so the colour disappears from the agenda', async () => {
    await useCase.execute('label-uuid', currentUser)

    expect(mockCache.delByPrefix).toHaveBeenCalledWith(`appointments:list:${clinicId}:`)
  })

  it('does not fail when cache invalidation fails', async () => {
    mockCache.delByPrefix.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute('label-uuid', currentUser)).resolves.toBeUndefined()
  })
})
