import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { LoadClinicLogoUseCase } from '../../clinics/use-cases/load-clinic-logo.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { FindTemplateByClinicAndIdUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-id.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { MedicalRecordPdfBuilderService } from '../services/medical-record-pdf-builder.service'
import { FindMedicalRecordByIdUseCase } from './find-medical-record-by-id.use-case'

@Injectable()
export class GenerateMedicalRecordPdfUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly findMedicalRecordByIdUseCase: FindMedicalRecordByIdUseCase,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly findTemplateByClinicAndIdUseCase: FindTemplateByClinicAndIdUseCase,
    private readonly loadClinicLogoUseCase: LoadClinicLogoUseCase,
    private readonly medicalRecordPdfBuilderService: MedicalRecordPdfBuilderService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<Buffer> {
    const clinicId = currentUser.clinicId!

    // Baixar é ler: a autorização é a mesma do `GET /:id`, sem regra própria.
    // Delegar em vez de repetir é também o que garante que as duas não se
    // separem depois — foi separando que o `findById` divergiu da listagem.
    await this.findMedicalRecordByIdUseCase.execute(id, currentUser)

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    const clinic = await this.findClinicByIdUseCase.execute(clinicId)

    // Os títulos das seções vivem no modelo, não no prontuário: só o
    // `sectionKey` de cada campo é congelado. Modelo excluído devolve `null` e
    // o documento sai em lista plana — o mesmo que a tela faz.
    const template = await this.findTemplateByClinicAndIdUseCase.execute(clinicId, record.templateId)

    const logoBase64 = await this.loadClinicLogoUseCase.execute(clinicId)

    return this.medicalRecordPdfBuilderService.build(
      {
        clinic: {
          name: clinic.name,
          address: clinic.address
            ? {
                street: clinic.address.street,
                number: clinic.address.number,
                complement: clinic.address.complement ?? null,
                neighborhood: clinic.address.neighborhood,
                city: clinic.address.city,
                state: clinic.address.state,
                zipCode: clinic.address.zipCode,
              }
            : null,
        },
        patient: {
          name: record.patient.user.fullName,
          documentNumber: record.patient.documentNumber ?? null,
        },
        professionalName: record.professional.user.fullName,
        specialtyName: record.specialty?.name ?? null,
        appointmentDate: record.appointment.date,
        appointmentStartTime: record.appointment.startTime,
        fields: record.templateSchemaSnapshot,
        data: record.data,
        notes: record.notes,
        sections: template?.sections ?? [],
      },
      logoBase64,
    )
  }
}
