import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindTemplateByClinicAndIdUseCase } from '../use-cases/find-template-by-clinic-and-id.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const clinicId = '10000000-0000-4000-8000-000000000000'

describe('FindTemplateByClinicAndIdUseCase', () => {
  let useCase: FindTemplateByClinicAndIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindTemplateByClinicAndIdUseCase({} as DataSource, mockTemplatesRepository)
  })

  it('scopes the lookup by clinic and returns the entity', async () => {
    const template = { id: faker.string.uuid(), clinicId } as any
    mockTemplatesRepository.findById.mockResolvedValue(template)

    const result = await useCase.execute(clinicId, template.id)

    expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(template.id, clinicId)
    expect(result).toBe(template)
  })

  // Modelo de outra clínica e modelo excluído chegam aqui do mesmo jeito: null.
  // Quem chama transforma nos dois no mesmo 404, para não revelar existência.
  it('returns null when the template does not belong to the clinic', async () => {
    mockTemplatesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(clinicId, faker.string.uuid())).resolves.toBeNull()
  })
})
