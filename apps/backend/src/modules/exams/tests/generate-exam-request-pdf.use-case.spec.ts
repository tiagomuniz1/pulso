import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'
import { GenerateExamRequestPdfUseCase } from '../use-cases/generate-exam-request-pdf.use-case'

const clinicId = 'clinic-uuid'
const examRequestId = 'exam-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeSnapshot = () => ({
  issuedAt: '2026-01-05T10:00:00.000Z',
  clinic: { name: 'Clínica', address: null, logoUrl: null },
  professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
  patient: { name: 'Patient', documentNumber: '12345678901' },
  items: [{ name: 'Hemograma completo', observations: null }],
  notes: null,
})

const makeExamRequest = () => ({
  id: examRequestId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId: 'doctor-uuid',
  issuedAt: new Date(),
  snapshot: makeSnapshot(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const mockFindByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindExamRequestByIdUseCase>

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
}

const mockLoadClinicLogo = {
  execute: jest.fn(),
} as unknown as jest.Mocked<LoadClinicLogoUseCase>

const mockPdfBuilderService = {
  build: jest.fn(),
} as unknown as jest.Mocked<ExamRequestPdfBuilderService>

const PDF_BUFFER = Buffer.from('%PDF-fake')

describe('GenerateExamRequestPdfUseCase', () => {
  let useCase: GenerateExamRequestPdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateExamRequestPdfUseCase(
      {} as DataSource,
      mockFindByIdUseCase,
      mockExamRequestsRepository,
      mockLoadClinicLogo,
      mockPdfBuilderService,
    )
    mockFindByIdUseCase.execute.mockResolvedValue({} as any)
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockLoadClinicLogo.execute.mockResolvedValue(null)
    mockPdfBuilderService.build.mockResolvedValue(PDF_BUFFER)
  })

  it('returns PDF buffer for ADMIN', async () => {
    const result = await useCase.execute(examRequestId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(examRequestId, adminUser)
  })

  it('returns PDF buffer for DOCTOR', async () => {
    const result = await useCase.execute(examRequestId, doctorUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(examRequestId, doctorUser)
  })

  it('delegates RBAC to FindExamRequestByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new ForbiddenException())

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockPdfBuilderService.build).not.toHaveBeenCalled()
  })

  it('propagates NotFoundException from FindExamRequestByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new NotFoundException())

    await expect(useCase.execute(examRequestId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('does not fetch logo when logoUrl is null', async () => {
    await useCase.execute(examRequestId, adminUser)

    expect(mockLoadClinicLogo.execute).not.toHaveBeenCalled()
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null)
  })

  it('reads the logo from storage by clinic and passes base64 to the builder', async () => {
    const logoUrl = 'https://example.com/logo.png'
    const logoBase64 = 'data:image/png;base64,abc123'
    const snapshotWithLogo = { ...makeSnapshot(), clinic: { name: 'Clínica', address: null, logoUrl } }

    mockExamRequestsRepository.findById.mockResolvedValue({
      ...makeExamRequest(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLoadClinicLogo.execute.mockResolvedValue(logoBase64)

    await useCase.execute(examRequestId, adminUser)

    // O `logoUrl` do snapshot só diz que havia logo na emissão; os bytes
    // vêm do storage, por clínica — nada de sair pela rede.
    expect(mockLoadClinicLogo.execute).toHaveBeenCalledWith(clinicId)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, logoBase64)
  })

  it('still builds PDF when logo fetch returns null (fallback)', async () => {
    const snapshotWithLogo = {
      ...makeSnapshot(),
      clinic: { name: 'Clínica', address: null, logoUrl: 'https://example.com/logo.png' },
    }
    mockExamRequestsRepository.findById.mockResolvedValue({
      ...makeExamRequest(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLoadClinicLogo.execute.mockResolvedValue(null)

    const result = await useCase.execute(examRequestId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, null)
  })
})
