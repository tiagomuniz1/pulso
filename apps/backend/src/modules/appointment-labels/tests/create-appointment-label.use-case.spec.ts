import { ConflictException } from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { DB_UNIQUE_CONSTRAINTS } from '../../../common/utils/db-constraint.utils'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../repositories/appointment-labels.repository.interface'
import { CreateAppointmentLabelUseCase } from '../use-cases/create-appointment-label.use-case'

function makeUniqueViolation(constraint: string): QueryFailedError {
  const error = new QueryFailedError('INSERT', [], new Error())
  ;(error as any).code = '23505'
  ;(error as any).constraint = constraint
  return error
}

const mockRepository: jest.Mocked<IAppointmentLabelsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCache = { delByPattern: jest.fn() } as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }
const dto = { name: 'Retorno', color: AppointmentLabelColor.GREEN }

const makeLabel = (overrides = {}) => ({
  id: 'label-uuid',
  clinicId,
  name: 'Retorno',
  color: AppointmentLabelColor.GREEN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('CreateAppointmentLabelUseCase', () => {
  let useCase: CreateAppointmentLabelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateAppointmentLabelUseCase({} as DataSource, mockRepository, mockCache)
    mockCache.delByPattern.mockResolvedValue(undefined as any)
  })

  it('creates the label scoped to the caller clinic', async () => {
    mockRepository.create.mockResolvedValue(makeLabel() as any)

    const result = await useCase.execute(dto, currentUser)

    expect(mockRepository.create).toHaveBeenCalledWith(
      { name: 'Retorno', color: AppointmentLabelColor.GREEN },
      clinicId,
    )
    expect(result.name).toBe('Retorno')
    expect(result.color).toBe(AppointmentLabelColor.GREEN)
  })

  // Sem nome único, dois "Retorno" seriam duas linhas idênticas no seletor e na
  // legenda, e o ADMIN não saberia qual editar.
  it('throws Conflict when the name is already used in the clinic', async () => {
    mockRepository.create.mockRejectedValue(
      makeUniqueViolation(DB_UNIQUE_CONSTRAINTS.APPOINTMENT_LABELS_CLINIC_NAME),
    )

    await expect(useCase.execute(dto, currentUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows an unrelated database error untouched', async () => {
    const boom = new Error('connection reset')
    mockRepository.create.mockRejectedValue(boom)

    await expect(useCase.execute(dto, currentUser)).rejects.toThrow(boom)
  })

  it('invalidates the catalogue listing', async () => {
    mockRepository.create.mockResolvedValue(makeLabel() as any)

    await useCase.execute(dto, currentUser)

    expect(mockCache.delByPattern).toHaveBeenCalledWith(`appointment_labels:list:${clinicId}*`)
  })

  it('does not fail when cache invalidation fails', async () => {
    mockRepository.create.mockResolvedValue(makeLabel() as any)
    mockCache.delByPattern.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(dto, currentUser)).resolves.toBeDefined()
  })
})
