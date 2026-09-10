import { UserRole } from '@app/shared'
import { MedicalRecordsController } from './medical-records.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'
import { UpdateMedicalRecordUseCase } from '../use-cases/update-medical-record.use-case'
import { FindMedicalRecordByIdUseCase } from '../use-cases/find-medical-record-by-id.use-case'
import { FindMedicalRecordByAppointmentUseCase } from '../use-cases/find-medical-record-by-appointment.use-case'
import { FindMedicalRecordsByPatientUseCase } from '../use-cases/find-medical-records-by-patient.use-case'
import { NotFoundException } from '@nestjs/common'
import { Response } from 'express'
import { GenerateMedicalRecordPdfUseCase } from '../use-cases/generate-medical-record-pdf.use-case'
import { DeleteMedicalRecordUseCase } from '../use-cases/delete-medical-record.use-case'
import { MedicalRecordListQueryDto } from '../dto/medical-record-list-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateMedicalRecordUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateMedicalRecordUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalRecordByIdUseCase>
const mockFindByAppointment = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalRecordByAppointmentUseCase>
const mockFindByPatient = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalRecordsByPatientUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteMedicalRecordUseCase>
const mockGeneratePdf = { execute: jest.fn() } as unknown as jest.Mocked<GenerateMedicalRecordPdfUseCase>

const currentUser: ICurrentUser = { id: 'admin-uuid', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

const makeResponse = () => ({
  id: 'record-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient',
  professionalId: 'doctor-uuid',
  professionalName: 'Doctor',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  appointmentDate: '2026-09-03',
  appointmentStartTime: '09:00',
  templateId: 'template-uuid',
  templateSchemaSnapshot: [],
  data: {},
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('MedicalRecordsController', () => {
  let controller: MedicalRecordsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MedicalRecordsController(
      mockCreate,
      mockUpdate,
      mockFindById,
      mockFindByAppointment,
      mockFindByPatient,
      mockDelete,
      mockGeneratePdf,
    )
  })

  it('create delegates to CreateMedicalRecordUseCase', async () => {
    const dto = { appointmentId: 'appt-uuid', data: {} }
    const response = makeResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findByAppointment delegates to FindMedicalRecordByAppointmentUseCase', async () => {
    const response = makeResponse()
    mockFindByAppointment.execute.mockResolvedValue(response)

    const result = await controller.findByAppointment('appt-uuid', currentUser)

    expect(mockFindByAppointment.execute).toHaveBeenCalledWith('appt-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('findByAppointment throws NotFoundException when use-case returns null', async () => {
    mockFindByAppointment.execute.mockResolvedValue(null)

    await expect(controller.findByAppointment('appt-uuid', currentUser)).rejects.toThrow('No medical record found for this appointment')
  })

  it('findByPatient delegates to FindMedicalRecordsByPatientUseCase with patientId', async () => {
    const query = Object.assign(new MedicalRecordListQueryDto(), { page: 1, limit: 20, patientId: 'patient-uuid' })
    const response = { data: [makeResponse()], total: 1, page: 1, limit: 20 }
    mockFindByPatient.execute.mockResolvedValue(response)

    const result = await controller.findByPatient(query, currentUser)

    expect(mockFindByPatient.execute).toHaveBeenCalledWith('patient-uuid', query, currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindMedicalRecordByIdUseCase', async () => {
    const response = makeResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('record-uuid', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('record-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateMedicalRecordUseCase', async () => {
    const dto = { notes: 'Updated notes' }
    const response = makeResponse()
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('record-uuid', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('record-uuid', dto, currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteMedicalRecordUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('record-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('record-uuid', currentUser)
  })

  describe('downloadPdf', () => {
    // O frontend nunca lê o `Content-Disposition` — o interceptor do
    // api-client descarta a resposta e devolve só `data`, então o nome do
    // arquivo é montado na UI. O header vale para quem baixa fora do app, e
    // as duas pontas seguem a mesma convenção `prontuario-<id>.pdf`.
    it('answers with the PDF bytes and the download headers', async () => {
      const buffer = Buffer.from('%PDF-fake')
      mockGeneratePdf.execute.mockResolvedValue(buffer)
      const res = { set: jest.fn(), end: jest.fn() } as unknown as Response

      await controller.downloadPdf('record-uuid', currentUser, res)

      expect(mockGeneratePdf.execute).toHaveBeenCalledWith('record-uuid', currentUser)
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="prontuario-record-uuid.pdf"',
        'Content-Length': buffer.length,
      })
      expect(res.end).toHaveBeenCalledWith(buffer)
    })

    it('does not answer anything when the use-case refuses', async () => {
      mockGeneratePdf.execute.mockRejectedValue(new NotFoundException())
      const res = { set: jest.fn(), end: jest.fn() } as unknown as Response

      await expect(controller.downloadPdf('record-uuid', currentUser, res)).rejects.toThrow(
        NotFoundException,
      )
      expect(res.set).not.toHaveBeenCalled()
      expect(res.end).not.toHaveBeenCalled()
    })
  })
})
