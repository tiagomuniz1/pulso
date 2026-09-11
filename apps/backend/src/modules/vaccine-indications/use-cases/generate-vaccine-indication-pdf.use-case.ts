import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { FindVaccineIndicationByIdUseCase } from './find-vaccine-indication-by-id.use-case'
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

@Injectable()
export class GenerateVaccineIndicationPdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findVaccineIndicationByIdUseCase: FindVaccineIndicationByIdUseCase,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly loadClinicLogoUseCase: LoadClinicLogoUseCase,
    private readonly vaccineIndicationPdfBuilderService: VaccineIndicationPdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findVaccineIndicationByIdUseCase.execute(id, currentUser)

    const indication = await this.vaccineIndicationsRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = indication!

    // O `logoUrl` do snapshot é só o sinal de que a clínica tinha logo na
    // emissão; os bytes vêm do storage, não daquela URL.
    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.loadClinicLogoUseCase.execute(currentUser.clinicId!)
      : null

    return this.vaccineIndicationPdfBuilderService.build(snapshot, logoBase64)
  }
}
