import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { FindExamRequestByIdUseCase } from './find-exam-request-by-id.use-case'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'

@Injectable()
export class GenerateExamRequestPdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findExamRequestByIdUseCase: FindExamRequestByIdUseCase,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly loadClinicLogoUseCase: LoadClinicLogoUseCase,
    private readonly examRequestPdfBuilderService: ExamRequestPdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    await this.findExamRequestByIdUseCase.execute(id, currentUser)

    const examRequest = await this.examRequestsRepository.findById(id, currentUser.clinicId!)
    const { snapshot } = examRequest!

    // O `logoUrl` do snapshot é só o sinal de que a clínica tinha logo na
    // emissão; os bytes vêm do storage, não daquela URL.
    const logoBase64 = snapshot.clinic.logoUrl
      ? await this.loadClinicLogoUseCase.execute(currentUser.clinicId!)
      : null

    return this.examRequestPdfBuilderService.build(snapshot, logoBase64)
  }
}
