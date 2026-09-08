import { QueryRunner, Repository } from 'typeorm'
import { MedicalRecord } from '../entities/medical-record.entity'
import { MedicalRecordsRepository } from './medical-records.repository'
import { CreateMedicalRecordData } from './medical-records.repository.interface'

const mockQueryBuilder = {
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getManyAndCount: jest.fn(),
}

const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
} as unknown as jest.Mocked<Repository<MedicalRecord>>

describe('MedicalRecordsRepository', () => {
  let repository: MedicalRecordsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    mockRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder)
    repository = new MedicalRecordsRepository(mockRepository)
  })

  describe('findById', () => {
    it('queries with id and clinicId', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      await repository.findById('id-1', 'clinic-1')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mr.id = :id', { id: 'id-1' })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.clinicId = :clinicId', { clinicId: 'clinic-1' })
    })

    it('returns null when not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      const result = await repository.findById('id-1', 'clinic-1')
      expect(result).toBeNull()
    })
  })

  describe('findByAppointment', () => {
    it('queries by appointmentId and clinicId', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null)
      await repository.findByAppointment('appt-1', 'clinic-1')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('mr.appointmentId = :appointmentId', { appointmentId: 'appt-1' })
    })
  })

  describe('findByPatient', () => {
    it('queries by patientId with pagination', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.patientId = :patientId', { patientId: 'patient-1' })
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0)
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20)
    })

    it('adds professionalId filter when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, { professionalId: 'doctor-1' })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.professionalId = :professionalId', { professionalId: 'doctor-1' })
    })

    it('skips professionalId filter when not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20)
      const andWhereCalls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
      expect(andWhereCalls).not.toContain('mr.professionalId = :professionalId')
    })

    it('filtra por especialidade quando informada', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, { specialtyId: 'spec-1' })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.specialtyId = :specialtyId', { specialtyId: 'spec-1' })
    })

    // Consulta generalista gera prontuário com specialty_id nulo, e `= NULL`
    // não casa — sem este caminho o histórico da consulta sem especialidade
    // viria vazio.
    it('filtra por especialidade nula no caso generalista', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, { specialtyIsNull: true })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mr.specialtyId IS NULL')
    })

    it('especialidade explícita tem precedência sobre a nula', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, { specialtyId: 'spec-1', specialtyIsNull: true })
      const calls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
      expect(calls).toContain('mr.specialtyId = :specialtyId')
      expect(calls).not.toContain('mr.specialtyId IS NULL')
    })

    // A consulta em que o médico está não entra no próprio histórico.
    it('exclui a consulta atual', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, { excludeAppointmentId: 'appt-1' })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'mr.appointmentId != :excludeAppointmentId',
        { excludeAppointmentId: 'appt-1' },
      )
    })

    // A regra do PROFESSIONAL: o que escreveu OU o que foi escrito nas
    // especialidades que exerce. É OR, não AND — com AND ele perderia os
    // próprios prontuários de especialidade que deixou de exercer.
    it('combina autoria e especialidades visíveis com OR', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, {
        visibleSpecialtyIds: ['spec-1', 'spec-2'],
        authorProfessionalId: 'doctor-1',
      })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(mr.specialtyId IN (:...visibleSpecialtyIds) OR mr.professionalId = :authorProfessionalId)',
        { visibleSpecialtyIds: ['spec-1', 'spec-2'], authorProfessionalId: 'doctor-1' },
      )
    })

    // Profissional sem especialidade cadastrada (nutricionista, por exemplo):
    // continua lendo o que escreveu.
    it('cai para autoria quando não há especialidades', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, {
        visibleSpecialtyIds: [],
        authorProfessionalId: 'doctor-1',
      })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'mr.professionalId = :authorProfessionalId',
        { authorProfessionalId: 'doctor-1' },
      )
    })

    it('usa só as especialidades quando não há autoria', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20, {
        visibleSpecialtyIds: ['spec-1'],
      })
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'mr.specialtyId IN (:...visibleSpecialtyIds)',
        { visibleSpecialtyIds: ['spec-1'] },
      )
    })

    // INNER JOIN, não LEFT: o TypeORM acrescenta `deleted_at IS NULL` ao join,
    // e é assim que prontuário de consulta excluída deixa de aparecer.
    it('junta a consulta por INNER JOIN, para excluir atendimento excluído', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])
      await repository.findByPatient('clinic-1', 'patient-1', 1, 20)
      expect(mockQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith('mr.appointment', 'appointment')
      expect(mockQueryBuilder.leftJoinAndSelect).not.toHaveBeenCalledWith('mr.appointment', 'appointment')
    })
  })

  describe('create', () => {
    const makeCreateData = (): CreateMedicalRecordData => ({
      clinicId: 'clinic-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      professionalId: 'doctor-1',
      specialtyId: 'specialty-1',
      templateId: 'template-1',
      templateSchemaSnapshot: [],
      data: {},
      notes: null,
    })

    it('saves record via own repository and reloads with joins', async () => {
      const saved = { id: 'new-id', clinicId: 'clinic-1' }
      const full = { id: 'new-id', clinicId: 'clinic-1', patient: {}, professional: {}, specialty: {} }
      ;(mockRepository.create as jest.Mock).mockReturnValue(saved)
      ;(mockRepository.save as jest.Mock).mockResolvedValue(saved)
      mockQueryBuilder.getOne.mockResolvedValue(full)

      const result = await repository.create(makeCreateData())
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toBe(full)
    })

    it('uses queryRunner manager repository when provided', async () => {
      const saved = { id: 'new-id', clinicId: 'clinic-1' }
      const full = { id: 'new-id', patient: {}, professional: {}, specialty: {} }
      const qrRepo = { create: jest.fn().mockReturnValue(saved), save: jest.fn().mockResolvedValue(saved) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner
      mockQueryBuilder.getOne.mockResolvedValue(full)

      await repository.create(makeCreateData(), qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.save).toHaveBeenCalled()
      expect(mockRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('patches data and notes and reloads', async () => {
      const updated = { id: 'id-1', patient: {}, professional: {}, specialty: {} }
      ;(mockRepository.update as jest.Mock).mockResolvedValue(undefined)
      mockQueryBuilder.getOne.mockResolvedValue(updated)

      const result = await repository.update('id-1', { data: { key: 'val' }, notes: 'new notes' }, 'clinic-1')
      expect(mockRepository.update).toHaveBeenCalledWith('id-1', { data: { key: 'val' }, notes: 'new notes' })
      expect(result).toBe(updated)
    })

    it('skips undefined fields in patch', async () => {
      const updated = { id: 'id-1', patient: {}, professional: {}, specialty: {} }
      ;(mockRepository.update as jest.Mock).mockResolvedValue(undefined)
      mockQueryBuilder.getOne.mockResolvedValue(updated)

      await repository.update('id-1', {}, 'clinic-1')
      expect(mockRepository.update).toHaveBeenCalledWith('id-1', {})
    })

    it('uses queryRunner manager repository when provided', async () => {
      const full = { id: 'id-1', patient: {}, professional: {}, specialty: {} }
      const qrRepo = { update: jest.fn().mockResolvedValue(undefined) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner
      mockQueryBuilder.getOne.mockResolvedValue(full)

      await repository.update('id-1', { notes: 'x' }, 'clinic-1', qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.update).toHaveBeenCalled()
      expect(mockRepository.update).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the record via own repository', async () => {
      ;(mockRepository.softDelete as jest.Mock).mockResolvedValue(undefined)
      await repository.delete('id-1', 'clinic-1')
      expect(mockRepository.softDelete).toHaveBeenCalledWith('id-1')
    })

    it('uses queryRunner manager repository when provided', async () => {
      const qrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const qr = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as unknown as QueryRunner

      await repository.delete('id-1', 'clinic-1', qr)

      expect(qr.manager.getRepository).toHaveBeenCalledWith(MedicalRecord)
      expect(qrRepo.softDelete).toHaveBeenCalledWith('id-1')
      expect(mockRepository.softDelete).not.toHaveBeenCalled()
    })
  })
})
