import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindMedicalRecordTemplateByIdUseCase } from '../use-cases/find-medical-record-template-by-id.use-case'
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
  findById: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
// Estes testes tratam de cache e resolução de nome da especialidade, não de
// recorte — por isso ADMIN, que não é recortado. O recorte do profissional tem
// bloco próprio no fim.
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }
const professionalUser: ICurrentUser = { id: 'u2', role: UserRole.PROFESSIONAL, clinicId }

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

describe('FindMedicalRecordTemplateByIdUseCase', () => {
  let useCase: FindMedicalRecordTemplateByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindMedicalRecordTemplateByIdUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockSpecialtiesRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
  })

  it('returns cached response when cache hits', async () => {
    const cached = { id: 'tpl-1' }
    mockCacheService.get.mockResolvedValue(cached as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result).toBe(cached as any)
    expect(mockTemplatesRepository.findById).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when not found (or from another clinic)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('tpl-1', currentUser)).rejects.toThrow(NotFoundException)
    expect(mockTemplatesRepository.findById).toHaveBeenCalledWith('tpl-1', clinicId)
  })

  it('resolves specialty name, caches and returns the response', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findById.mockResolvedValue(template as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ id: 'spec-1', name: 'Cardiologia' } as any)

    const result = await useCase.execute(template.id, currentUser)

    expect(result.specialtyName).toBe('Cardiologia')
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_template:${clinicId}:${template.id}`,
      result,
      300,
    )
  })

  it('returns null specialtyName when specialty is missing', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.specialtyName).toBeNull()
  })

  it('skips the specialty lookup for a generalist template (null specialtyId)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate({ specialtyId: null }) as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(mockSpecialtiesRepository.findById).not.toHaveBeenCalled()
    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ name: 'Cardiologia' } as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.specialtyName).toBe('Cardiologia')
  })

  it('continues when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findById.mockResolvedValue(makeTemplate() as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ name: 'Cardiologia' } as any)

    const result = await useCase.execute('tpl-1', currentUser)

    expect(result.id).toBeDefined()
  })

  // Modelo de prontuário é da clínica, mas o profissional só consulta o que se
  // aplica ao trabalho dele: as especialidades que exerce e o generalista da
  // própria profissão.
  describe('recorte do profissional', () => {
    const comEspecialidade = (specialtyId: string | null, councilType: CouncilType | null) => ({
      id: 'tpl-1',
      clinicId,
      specialtyId,
      councilType,
      name: 'Modelo',
      fields: [],
      sections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    function profissional(specialtyIds: string[], council: CouncilType) {
      ;(mockProfessionalsRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'prof-1',
        professionalSpecialties: specialtyIds.map((id) => ({ specialtyId: id })),
        registrations: [{ councilType: council, isPrimary: true }],
      })
    }

    beforeEach(() => {
      ;(mockCacheService.get as jest.Mock).mockResolvedValue(null)
      ;(mockSpecialtiesRepository.findById as jest.Mock).mockResolvedValue({ id: 'spec-1', name: 'Gineco' })
    })

    it('lê o modelo de uma especialidade que exerce', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(comEspecialidade('spec-1', null) as any)
      profissional(['spec-1'], CouncilType.CRM)

      await expect(useCase.execute('tpl-1', professionalUser)).resolves.toBeDefined()
    })

    it('recusa modelo de especialidade que não exerce', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(comEspecialidade('spec-9', null) as any)
      profissional(['spec-1'], CouncilType.CRM)

      await expect(useCase.execute('tpl-1', professionalUser)).rejects.toThrow(ForbiddenException)
    })

    it('lê o generalista da própria profissão', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(comEspecialidade(null, CouncilType.CRN) as any)
      profissional([], CouncilType.CRN)

      await expect(useCase.execute('tpl-1', professionalUser)).resolves.toBeDefined()
    })

    it('recusa o generalista de outra profissão', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(comEspecialidade(null, CouncilType.CRM) as any)
      profissional([], CouncilType.CRN)

      await expect(useCase.execute('tpl-1', professionalUser)).rejects.toThrow(ForbiddenException)
    })

    it('recusa quem não tem ficha de profissional', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(comEspecialidade('spec-1', null) as any)
      ;(mockProfessionalsRepository.findByUserId as jest.Mock).mockResolvedValue(null)

      await expect(useCase.execute('tpl-1', professionalUser)).rejects.toThrow(ForbiddenException)
    })

    // A chave do cache é por id, sem papel nenhum: sem checar o que veio do
    // cache, o profissional leria um modelo fora do escopo dele.
    it('recorta também o que vem do cache', async () => {
      ;(mockCacheService.get as jest.Mock).mockResolvedValue({
        id: 'tpl-1',
        specialtyId: 'spec-9',
        councilType: null,
        name: 'Modelo',
      })
      profissional(['spec-1'], CouncilType.CRM)

      await expect(useCase.execute('tpl-1', professionalUser)).rejects.toThrow(ForbiddenException)
      expect(mockTemplatesRepository.findById).not.toHaveBeenCalled()
    })
  })
})
