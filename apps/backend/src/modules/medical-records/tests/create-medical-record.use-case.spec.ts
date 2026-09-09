import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentStatus, CouncilType, MedicalRecordFieldType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { FindTemplateByClinicAndIdUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-id.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { CreateMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const patientId = 'patient-uuid'
const specialtyId = 'specialty-uuid'
const templateId = 'template-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeAppointment = (overrides = {}) => ({
  id: appointmentId,
  clinicId,
  professionalId,
  patientId,
  specialtyId,
  status: AppointmentStatus.SCHEDULED,
  ...overrides,
})

const makeTemplate = (overrides = {}) => ({
  id: templateId,
  specialtyId,
  clinicId,
  councilType: null,
  isActive: true,
  fields: [
    {
      key: 'notes_0ab1',
      label: 'Notes',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 1,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
    },
  ],
  ...overrides,
})

const makeRecord = () => ({
  id: 'record-uuid',
  appointmentId,
  patientId,
  professionalId,
  specialtyId,
  templateId,
  templateSchemaSnapshot: makeTemplate().fields,
  data: {},
  notes: null,
  patient: { user: { fullName: 'Patient Name' } },
  professional: { user: { fullName: 'Doctor Name' } },
  // A query junta a consulta por INNER JOIN: a relação está sempre carregada.
  appointment: { id: 'appt-uuid', date: '2026-03-11', startTime: '14:30' } as any,
  specialty: { name: 'Cardiologia' },
  createdAt: new Date(),
  updatedAt: new Date(),
})

const mockMedicalRecordsRepository: jest.Mocked<IMedicalRecordsRepository> = {
  findById: jest.fn(),
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  findActiveByDatesAndTime: jest.fn(),
  findBySeriesId: jest.fn(),
  findBySeriesIdFromDate: jest.fn(),
  countBySeriesIdAfterDate: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockFindTemplate = { execute: jest.fn() } as unknown as jest.Mocked<FindTemplateByClinicAndIdUseCase>

const mockValidate = { validate: jest.fn() } as unknown as jest.Mocked<ValidateRecordDataService>

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('CreateMedicalRecordUseCase', () => {
  let useCase: CreateMedicalRecordUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateMedicalRecordUseCase(
      {} as DataSource,
      mockMedicalRecordsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockFindTemplate,
      mockValidate,
      mockCache,
    )
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate())
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(null)
    mockMedicalRecordsRepository.create.mockResolvedValue(makeRecord() as any)
    mockCache.delByPattern.mockResolvedValue(undefined)
  })

  it('creates a medical record for ADMIN', async () => {
    const dto = { appointmentId, templateId, data: {}, notes: undefined }
    const result = await useCase.execute(dto, adminUser)
    expect(result.appointmentId).toBe(appointmentId)
    expect(result.patientName).toBe('Patient Name')
    expect(result.professionalName).toBe('Doctor Name')
    expect(result.specialtyName).toBe('Cardiologia')
    expect(mockMedicalRecordsRepository.create).toHaveBeenCalled()
  })

  it('creates a medical record for DOCTOR (own appointment)', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    const dto = { appointmentId, templateId, data: {} }
    await useCase.execute(dto, doctorUser)
    expect(mockMedicalRecordsRepository.create).toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR creates for another doctor appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('creates a generalist record when the appointment has no specialty (null)', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue({
      id: professionalId,
      registrations: [{ id: 'reg-1', councilType: CouncilType.CRM, isPrimary: true }],
    } as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(
      makeTemplate({ specialtyId: null, councilType: CouncilType.CRM }),
    )
    mockMedicalRecordsRepository.create.mockResolvedValue({
      ...makeRecord(),
      specialtyId: null,
      specialty: null,
    } as any)

    const result = await useCase.execute({ appointmentId, templateId, data: {} }, adminUser)

    expect(mockProfessionalsRepository.findById).toHaveBeenCalledWith(professionalId, clinicId)
    const createArg = mockMedicalRecordsRepository.create.mock.calls[0][0]
    expect(createArg.specialtyId).toBeNull()
    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
  })

  it('throws NotFoundException when the appointment professional cannot be resolved for a generalist appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(
      NotFoundException,
    )
  })

  it('resolves the appointment professional\'s own council type for a non-CRM generalist appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue({
      id: professionalId,
      registrations: [{ id: 'reg-1', councilType: CouncilType.CRN, isPrimary: true }],
    } as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(
      makeTemplate({ specialtyId: null, councilType: CouncilType.CRN }),
    )

    await useCase.execute({ appointmentId, templateId, data: {} }, adminUser)

    expect(mockFindTemplate.execute).toHaveBeenCalledWith(clinicId, templateId)
  })

  // Modelo inexistente e modelo de outra clínica chegam iguais aqui — o
  // repositório escopa por clínica e devolve null nos dois casos.
  it('throws NotFoundException when the chosen template is not in the clinic', async () => {
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(null)
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(NotFoundException)
  })

  // Desativar é como a clínica aposenta um modelo. 422 e não 404: ele existe e é
  // legível, é a regra que recusa usá-lo num prontuário novo.
  it('throws UnprocessableEntityException when the chosen template is inactive', async () => {
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate({ isActive: false }))
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockMedicalRecordsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when the chosen template is from another specialty', async () => {
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate({ specialtyId: 'other-specialty' }))
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  // A consulta é generalista, mas o modelo escolhido é de uma especialidade.
  it('throws UnprocessableEntityException when a specialty template is chosen for a generalist appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue({
      id: professionalId,
      registrations: [{ id: 'reg-1', councilType: CouncilType.CRM, isPrimary: true }],
    } as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(makeTemplate({ specialtyId: 'spec-1' }))

    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  // O caso que a FK composta não pega: os dois lados com specialty nula, então o
  // banco nem checa. Uma nutricionista escolhendo o generalista do médico.
  it('throws UnprocessableEntityException when the generalist template belongs to another profession', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockResolvedValue({
      id: professionalId,
      registrations: [{ id: 'reg-1', councilType: CouncilType.CRN, isPrimary: true }],
    } as any)
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(
      makeTemplate({ specialtyId: null, councilType: CouncilType.CRM }),
    )

    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockMedicalRecordsRepository.create).not.toHaveBeenCalled()
  })

  // O prontuário congela o modelo escolhido, não um resolvido pelo servidor.
  it('snapshots the chosen template', async () => {
    const chosen = makeTemplate({ id: 'chosen-template', fields: [{ key: 'x', label: 'X' }] })
    ;(mockFindTemplate.execute as jest.Mock).mockResolvedValue(chosen)

    await useCase.execute({ appointmentId, templateId: 'chosen-template', data: {} }, adminUser)

    const createArg = mockMedicalRecordsRepository.create.mock.calls[0][0]
    expect(createArg.templateId).toBe('chosen-template')
    expect(createArg.templateSchemaSnapshot).toBe(chosen.fields)
  })

  it('throws ConflictException when record already exists', async () => {
    mockMedicalRecordsRepository.findByAppointment.mockResolvedValue(makeRecord() as any)
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).rejects.toThrow(ConflictException)
  })

  it('invalidates patient cache on create', async () => {
    await useCase.execute({ appointmentId, templateId, data: {} }, adminUser)
    expect(mockCache.delByPattern).toHaveBeenCalledWith(`medical_records:patient:${patientId}*`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCache.delByPattern.mockRejectedValue(new Error('redis error'))
    await expect(useCase.execute({ appointmentId, templateId, data: {} }, adminUser)).resolves.toBeDefined()
  })
})
