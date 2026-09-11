import { In, Repository } from 'typeorm'
import { AppointmentLabelColor } from '@app/shared'
import { AppointmentLabel } from '../entities/appointment-label.entity'
import { AppointmentLabelsRepository } from './appointment-labels.repository'

function makeQueryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
}

function makeRepo(): jest.Mocked<Repository<AppointmentLabel>> {
  return {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    findBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<AppointmentLabel>>
}

const clinicId = '10000000-0000-4000-8000-000000000000'
const makeLabel = () =>
  ({ id: 'l1', clinicId, name: 'Retorno', color: AppointmentLabelColor.GREEN }) as AppointmentLabel

describe('AppointmentLabelsRepository', () => {
  let repo: jest.Mocked<Repository<AppointmentLabel>>
  let repository: AppointmentLabelsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new AppointmentLabelsRepository(repo)
  })

  describe('findAll', () => {
    it('scopes by clinic, orders by name and paginates', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[makeLabel()], 1])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(clinicId, 2, 10)

      expect(qb.where).toHaveBeenCalledWith('label.clinicId = :clinicId', { clinicId })
      expect(qb.orderBy).toHaveBeenCalledWith('label.name', 'ASC')
      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('filters by isActive when the flag is given', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(clinicId, 1, 20, true)

      expect(qb.andWhere).toHaveBeenCalledWith('label.isActive = :isActive', { isActive: true })
    })

    // Sem o flag a gestão vê ativos e inativos: é assim que se reativa um.
    it('does not filter by isActive when the flag is omitted', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(clinicId, 1, 20)

      expect(qb.andWhere).not.toHaveBeenCalled()
    })
  })

  it('findById scopes by clinic', async () => {
    repo.findOneBy.mockResolvedValue(makeLabel())

    await repository.findById('l1', clinicId)

    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'l1', clinicId })
  })

  describe('findByIds', () => {
    it('resolves a batch scoped by clinic', async () => {
      repo.findBy.mockResolvedValue([makeLabel()])

      await repository.findByIds(['l1', 'l2'], clinicId)

      expect(repo.findBy).toHaveBeenCalledWith({ id: In(['l1', 'l2']), clinicId })
    })

    // Um IN vazio no Postgres é erro de sintaxe — nem chega ao banco.
    it('short-circuits an empty list without querying', async () => {
      await expect(repository.findByIds([], clinicId)).resolves.toEqual([])
      expect(repo.findBy).not.toHaveBeenCalled()
    })
  })

  it('create injects the clinicId', async () => {
    const label = makeLabel()
    repo.create.mockReturnValue(label)
    repo.save.mockResolvedValue(label)

    await repository.create({ name: 'Retorno' } as any, clinicId)

    expect(repo.create).toHaveBeenCalledWith({ name: 'Retorno', clinicId })
  })

  it('update finds scoped by clinic then saves', async () => {
    const label = makeLabel()
    repo.findOneByOrFail.mockResolvedValue(label)
    repo.save.mockResolvedValue(label)

    await repository.update('l1', { name: 'Novo' } as any, clinicId)

    expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: 'l1', clinicId })
    expect(repo.save).toHaveBeenCalled()
  })

  it('delete soft deletes scoped by clinic', async () => {
    await repository.delete('l1', clinicId)

    expect(repo.softDelete).toHaveBeenCalledWith({ id: 'l1', clinicId })
  })
})
