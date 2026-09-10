import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { UpdateAppointmentLabelUseCase } from '../use-cases/update-appointment-label.use-case'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('UPDATE', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

const mockRepository: jest.Mocked<IAppointmentLabelsRepository> = {
  findAll: jest.fn(), findById: jest.fn(), findByIds: jest.fn(),
  create: jest.fn(), update: jest.fn(), delete: jest.fn(),
}
const mockCache = {
  del: jest.fn(), delByPattern: jest.fn(), delByPrefix: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }
const makeLabel = (overrides = {}) => ({
  id: 'label-uuid', clinicId, name: 'Retorno', color: AppointmentLabelColor.GREEN,
  isActive: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...overrides,
})

describe('UpdateAppointmentLabelUseCase', () => {
  let useCase: UpdateAppointmentLabelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateAppointmentLabelUseCase({} as DataSource, mockRepository, mockCache)
    mockRepository.findById.mockResolvedValue(makeLabel() as any)
    mockRepository.update.mockResolvedValue(makeLabel() as any)
    mockCache.del.mockResolvedValue(undefined as any)
    mockCache.delByPattern.mockResolvedValue(undefined as any)
    mockCache.delByPrefix.mockResolvedValue(undefined as any)
  })

  it('throws NotFound for a label from another clinic', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('x', { name: 'Novo' }, currentUser)).rejects.toThrow(NotFoundException)
    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('updates only the fields that were sent', async () => {
    await useCase.execute('label-uuid', { isActive: false }, currentUser)

    expect(mockRepository.update).toHaveBeenCalledWith('label-uuid', { isActive: false }, clinicId)
  })

  it('throws Conflict when renaming onto an existing name', async () => {
    mockRepository.update.mockRejectedValue(
      makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.APPOINTMENT_LABELS_CLINIC_NAME),
    )

    await expect(useCase.execute('label-uuid', { name: 'Encaixe' }, currentUser)).rejects.toThrow(
      ConflictException,
    )
  })

  // O rótulo viaja embutido no payload da consulta: renomear ou recolorir muda o
  // conteúdo de toda lista de agenda em cache. Sem esta invalidação, a agenda
  // mostraria o nome velho até o TTL expirar.
  it('invalidates the appointment listings, not just the catalogue', async () => {
    await useCase.execute('label-uuid', { name: 'Retorno rápido' }, currentUser)

    expect(mockCache.delByPattern).toHaveBeenCalledWith(`appointment_labels:list:${clinicId}*`)
    expect(mockCache.delByPrefix).toHaveBeenCalledWith(`appointments:list:${clinicId}:`)
  })

  it('does not fail when cache invalidation fails', async () => {
    mockCache.delByPrefix.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute('label-uuid', { name: 'X' }, currentUser)).resolves.toBeDefined()
  })
})
