import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordFieldType, UserRole } from '@app/shared'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { FindTemplateByClinicAndIdUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-id.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { MedicalRecordPdfBuilderService } from '../services/medical-record-pdf-builder.service'
import { FindMedicalRecordByIdUseCase } from '../use-cases/find-medical-record-by-id.use-case'
import { GenerateMedicalRecordPdfUseCase } from '../use-cases/generate-medical-record-pdf.use-case'

const clinicId = 'clinic-uuid'
const recordId = 'record-uuid'
const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }

const record = {
  id: recordId,
  templateId: 'template-uuid',
  templateSchemaSnapshot: [
    {
      key: 'queixa',
      label: 'Queixa principal',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
  ],
  data: { queixa: 'Cefaleia' },
  notes: null,
  patient: { user: { fullName: 'Clara Monteiro Alves' }, documentNumber: '12345678901' },
  professional: { user: { fullName: 'Dra. Helena Vasconcelos' } },
  specialty: { name: 'Ginecologia e Obstetrícia' },
  appointment: { date: '2026-09-04', startTime: '14:30' },
} as any

const clinic = {
  name: 'Clínica Pulso',
  address: {
    street: 'Rua das Flores',
    number: '100',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01001000',
  },
  logoUrl: 'https://api.pulso.center/clinics/pulso/logo?v=1',
} as any

const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalRecordByIdUseCase>
const mockFindClinic = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockFindTemplate = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindTemplateByClinicAndIdUseCase>
const mockLoadClinicLogo = { execute: jest.fn() } as unknown as jest.Mocked<LoadClinicLogoUseCase>
const mockBuilder = { build: jest.fn() } as unknown as jest.Mocked<MedicalRecordPdfBuilderService>

const mockRepository: jest.Mocked<IMedicalRecordsRepository> = {
  findById: jest.fn(),
  findByAppointment: jest.fn(),
  findByPatient: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('GenerateMedicalRecordPdfUseCase', () => {
  let useCase: GenerateMedicalRecordPdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateMedicalRecordPdfUseCase(
      {} as DataSource,
      mockFindById,
      mockRepository,
      mockFindClinic,
      mockFindTemplate,
      mockLoadClinicLogo,
      mockBuilder,
    )
    mockFindById.execute.mockResolvedValue({ id: recordId } as any)
    mockRepository.findById.mockResolvedValue(record)
    mockFindClinic.execute.mockResolvedValue(clinic)
    mockFindTemplate.execute.mockResolvedValue({
      sections: [{ key: 'anamnese', title: 'Anamnese', order: 0 }],
    } as any)
    mockLoadClinicLogo.execute.mockResolvedValue('data:image/png;base64,AAAA')
    mockBuilder.build.mockResolvedValue(Buffer.from('%PDF-fake'))
  })

  it('returns the rendered buffer', async () => {
    const buffer = await useCase.execute(recordId, adminUser)
    expect(buffer.toString()).toBe('%PDF-fake')
  })

  // Baixar é ler: a autorização é delegada ao mesmo use-case do `GET /:id`,
  // e tem de vir antes de qualquer leitura de dado.
  it('authorises through the read use-case before touching anything else', async () => {
    await useCase.execute(recordId, adminUser)

    expect(mockFindById.execute).toHaveBeenCalledWith(recordId, adminUser)
    expect(mockFindById.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mockRepository.findById.mock.invocationCallOrder[0],
    )
  })

  it.each([
    ['NotFoundException', new NotFoundException('Medical record not found')],
    ['ForbiddenException', new ForbiddenException('Insufficient permissions')],
  ])('propagates %s from the read use-case without rendering', async (_name, error) => {
    mockFindById.execute.mockRejectedValue(error)

    await expect(useCase.execute(recordId, adminUser)).rejects.toThrow(error.constructor as any)
    expect(mockBuilder.build).not.toHaveBeenCalled()
  })

  it('passes the frozen fields, the live sections and the clinic to the builder', async () => {
    await useCase.execute(recordId, adminUser)

    expect(mockBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
        clinic: expect.objectContaining({ name: 'Clínica Pulso' }),
        patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678901' },
        professionalName: 'Dra. Helena Vasconcelos',
        specialtyName: 'Ginecologia e Obstetrícia',
        appointmentDate: '2026-09-04',
        appointmentStartTime: '14:30',
        fields: record.templateSchemaSnapshot,
        data: record.data,
        sections: [{ key: 'anamnese', title: 'Anamnese', order: 0 }],
      }),
      'data:image/png;base64,AAAA',
    )
  })

  // O modelo pode ter sido excluído depois de o prontuário ser escrito. O
  // documento sai em lista plana em vez de falhar.
  it('renders without sections when the template no longer exists', async () => {
    mockFindTemplate.execute.mockResolvedValue(null)

    await useCase.execute(recordId, adminUser)

    expect(mockBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({ sections: [] }),
      expect.anything(),
    )
  })

  // Quem decide "esta clínica não tem logo" é o carregador, que lê o
  // `logoPath` — não este use-case olhando uma URL. Antes a decisão estava
  // aqui e dependia de um campo que descrevia um endereço HTTP.
  it('asks the loader by clinic and renders without logo when it gives up', async () => {
    mockLoadClinicLogo.execute.mockResolvedValue(null)

    await useCase.execute(recordId, adminUser)

    expect(mockLoadClinicLogo.execute).toHaveBeenCalledWith(clinicId)
    expect(mockBuilder.build).toHaveBeenCalledWith(expect.anything(), null)
  })

  // O fetcher devolve `null` para logo corrompido ou inalcançável. O documento
  // sai sem logo — nunca deixa de sair por causa de uma imagem.
  it('renders without logo when the fetcher gives up', async () => {
    mockLoadClinicLogo.execute.mockResolvedValue(null)

    await useCase.execute(recordId, adminUser)

    expect(mockBuilder.build).toHaveBeenCalledWith(expect.anything(), null)
  })

  it('renders a generalist record without a specialty', async () => {
    mockRepository.findById.mockResolvedValue({ ...record, specialty: null })

    await useCase.execute(recordId, adminUser)

    expect(mockBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({ specialtyName: null }),
      expect.anything(),
    )
  })

  it('throws NotFoundException when the record vanishes between the two reads', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(recordId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockBuilder.build).not.toHaveBeenCalled()
  })
})
