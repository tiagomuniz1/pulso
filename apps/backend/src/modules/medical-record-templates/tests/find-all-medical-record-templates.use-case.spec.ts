import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindAllMedicalRecordTemplatesUseCase } from '../use-cases/find-all-medical-record-templates.use-case'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository = {
  findByIds: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

const makeTemplate = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: 'spec-1',
  name: 'Template',
  fields: [],
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockProfessionalsRepository = {
  findByUserId: jest.fn(),
} as unknown as jest.Mocked<IProfessionalsRepository>

describe('FindAllMedicalRecordTemplatesUseCase', () => {
  let useCase: FindAllMedicalRecordTemplatesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllMedicalRecordTemplatesUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockSpecialtiesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
  })

  it('returns cached result when cache hits', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached as any)

    const result = await useCase.execute({} as any, currentUser)

    expect(result).toBe(cached as any)
    expect(mockTemplatesRepository.findAll).not.toHaveBeenCalled()
  })

  it('queries repository on miss, resolves specialty names and caches', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findAll.mockResolvedValue([[template] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([{ id: 'spec-1', name: 'Cardiologia' }] as any)

    const result = await useCase.execute({ specialtyId: 'spec-1' } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, 'spec-1', undefined, undefined, undefined)
    expect(result.data[0].specialtyName).toBe('Cardiologia')
    expect(result.total).toBe(1)
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:spec-1:all`,
      result,
      60,
    )
  })

  it('returns null specialtyName for a generalist template (null specialtyId)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(mockSpecialtiesRepository.findByIds).toHaveBeenCalledWith([])
    expect(result.data[0].specialtyId).toBeNull()
    expect(result.data[0].specialtyName).toBeNull()
  })

  it('forwards the generalist flag and uses a "generalist" cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ generalist: true } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, undefined, true, undefined, undefined)
    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:generalist:all`,
    )
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:generalist:all`,
      result,
      60,
    )
    expect(result.data[0].specialtyId).toBeNull()
  })

  it('forwards the councilType filter and uses it as the cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null, councilType: 'crn' })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ councilType: 'crn' } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, undefined, undefined, 'crn', undefined)
    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:crn:all`,
    )
    expect(result.data[0].specialtyId).toBeNull()
  })

  it('uses "all" cache key and null name when specialty is missing', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findAll.mockResolvedValue([[template] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ page: 2, limit: 10 } as any, currentUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:2:10:all:all`,
    )
    expect(result.data[0].specialtyName).toBeNull()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findAll.mockResolvedValue([[], 0])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(result.total).toBe(0)
  })

  it('continues when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findAll.mockResolvedValue([[], 0])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(result.data).toEqual([])
  })

  // Modelo de prontuário é da clínica, mas o profissional só consulta o que se
  // aplica ao trabalho dele. O recorte vai ao repositório, não é filtrado
  // depois, para o total da paginação bater com o que ele enxerga.
  describe('recorte do profissional', () => {
    const professionalUser: ICurrentUser = { id: 'u2', role: UserRole.PROFESSIONAL, clinicId }

    function profissional(specialtyIds: string[], council: CouncilType) {
      ;(mockProfessionalsRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        professionalSpecialties: specialtyIds.map((id) => ({ specialtyId: id })),
        registrations: [{ councilType: council, isPrimary: true }],
      })
    }

    beforeEach(() => {
      ;(mockCacheService.get as jest.Mock).mockResolvedValue(null)
      mockTemplatesRepository.findAll.mockResolvedValue([[], 0])
    })

    it('passa as especialidades e a profissão ao repositório', async () => {
      profissional(['spec-1', 'spec-2'], CouncilType.CRM)

      await useCase.execute({} as any, professionalUser)

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(
        clinicId, 1, 20, undefined, undefined, undefined,
        { specialtyIds: ['spec-1', 'spec-2'], councilType: CouncilType.CRM },
      )
    })

    it('quem não tem ficha não enxerga escopo algum', async () => {
      ;(mockProfessionalsRepository.findByUserId as jest.Mock).mockResolvedValue(null)

      await useCase.execute({} as any, professionalUser)

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(
        clinicId, 1, 20, undefined, undefined, undefined,
        { specialtyIds: [], councilType: null },
      )
    })

    // Sem o escopo na chave, o profissional leria o cache do ADMIN, que contém
    // o catálogo inteiro da clínica.
    it('separa o cache por escopo', async () => {
      profissional(['spec-1'], CouncilType.CRM)

      await useCase.execute({} as any, professionalUser)

      const chave = (mockCacheService.get as jest.Mock).mock.calls[0][0]
      expect(chave).toContain('spec-1')
      expect(chave).not.toMatch(/:all$/)
    })
  })
})
