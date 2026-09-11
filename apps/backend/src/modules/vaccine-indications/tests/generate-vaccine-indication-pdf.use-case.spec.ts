import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { FindVaccineIndicationByIdUseCase } from '../use-cases/find-vaccine-indication-by-id.use-case'
import { GenerateVaccineIndicationPdfUseCase } from '../use-cases/generate-vaccine-indication-pdf.use-case'
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

const currentUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

const makeSnapshot = (logoUrl: string | null) => ({
  issuedAt: new Date().toISOString(),
  clinic: { name: 'Clínica Pulso', address: null, logoUrl },
  professional: { name: 'Dra. Helena', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
  patient: { name: 'Clara', documentNumber: null },
  items: [],
  notes: null,
})

describe('GenerateVaccineIndicationPdfUseCase', () => {
  const findById = { execute: jest.fn() } as unknown as jest.Mocked<FindVaccineIndicationByIdUseCase>
  const repository = { findById: jest.fn() } as unknown as jest.Mocked<IVaccineIndicationsRepository>
  const loadClinicLogo = { execute: jest.fn() } as unknown as jest.Mocked<LoadClinicLogoUseCase>
  const builder = { build: jest.fn() } as unknown as jest.Mocked<VaccineIndicationPdfBuilderService>
  let useCase: GenerateVaccineIndicationPdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateVaccineIndicationPdfUseCase(
      {} as DataSource, findById, repository, loadClinicLogo, builder,
    )
    ;(builder.build as jest.Mock).mockResolvedValue(Buffer.from('%PDF'))
    ;(findById.execute as jest.Mock).mockResolvedValue({})
  })

  // A permissão é do find, não duplicada aqui: gerar PDF de documento que o
  // usuário não pode ler seria vazamento pela porta dos fundos.
  it('passa pela checagem de permissão antes de renderizar', async () => {
    ;(repository.findById as jest.Mock).mockResolvedValue({ clinicId: 'clinic-uuid', snapshot: makeSnapshot(null) })
    ;(findById.execute as jest.Mock).mockRejectedValue(new Error('forbidden'))

    await expect(useCase.execute('indication-uuid', currentUser)).rejects.toThrow('forbidden')
    expect(builder.build).not.toHaveBeenCalled()
  })

  // O `logoUrl` do snapshot só diz que havia logo na emissão; os bytes vêm do
  // storage, por clínica — nada de sair pela rede para ler o próprio arquivo.
  it('lê o logo do storage quando a clínica tem, e o entrega ao builder', async () => {
    ;(repository.findById as jest.Mock).mockResolvedValue({
      clinicId: 'clinic-uuid',
      snapshot: makeSnapshot('https://exemplo.com/logo.png'),
    })
    ;(loadClinicLogo.execute as jest.Mock).mockResolvedValue('data:image/png;base64,abc')

    await useCase.execute('indication-uuid', currentUser)

    expect(loadClinicLogo.execute).toHaveBeenCalledWith('clinic-uuid')
    expect(builder.build).toHaveBeenCalledWith(expect.anything(), 'data:image/png;base64,abc')
  })

  it('não busca logo quando a clínica não tem', async () => {
    ;(repository.findById as jest.Mock).mockResolvedValue({ clinicId: 'clinic-uuid', snapshot: makeSnapshot(null) })

    const buffer = await useCase.execute('indication-uuid', currentUser)

    expect(loadClinicLogo.execute).not.toHaveBeenCalled()
    expect(builder.build).toHaveBeenCalledWith(expect.anything(), null)
    expect(buffer.toString()).toBe('%PDF')
  })
})
