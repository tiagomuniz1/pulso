import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { FindMedicalCertificateByIdUseCase } from './find-medical-certificate-by-id.use-case'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { MedicalCertificatePdfBuilderService } from '../services/medical-certificate-pdf-builder.service'

@Injectable()
export class GenerateMedicalCertificatePdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findMedicalCertificateByIdUseCase: FindMedicalCertificateByIdUseCase,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly loadClinicLogoUseCase: LoadClinicLogoUseCase,
    private readonly medicalCertificatePdfBuilderService: MedicalCertificatePdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findMedicalCertificateByIdUseCase.execute(id, currentUser)

    const certificate = await this.medicalCertificatesRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = certificate!

    // O `logoUrl` do snapshot é só o sinal de que a clínica tinha logo na
    // emissão; os bytes vêm do storage, não daquela URL.
    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.loadClinicLogoUseCase.execute(currentUser.clinicId!)
      : null

    return this.medicalCertificatePdfBuilderService.build(snapshot, logoBase64)
  }
}
