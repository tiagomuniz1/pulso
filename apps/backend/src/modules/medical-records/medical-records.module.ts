import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { PdfModule } from '../../common/pdf/pdf.module'
import { ClinicsModule } from '../clinics/clinics.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { MedicalRecordTemplatesModule } from '../medical-record-templates/medical-record-templates.module'
import { MedicalRecord } from './entities/medical-record.entity'
import { MedicalRecordsController } from './controllers/medical-records.controller'
import { CreateMedicalRecordUseCase } from './use-cases/create-medical-record.use-case'
import { UpdateMedicalRecordUseCase } from './use-cases/update-medical-record.use-case'
import { FindMedicalRecordByIdUseCase } from './use-cases/find-medical-record-by-id.use-case'
import { FindMedicalRecordByAppointmentUseCase } from './use-cases/find-medical-record-by-appointment.use-case'
import { FindMedicalRecordsByPatientUseCase } from './use-cases/find-medical-records-by-patient.use-case'
import { DeleteMedicalRecordUseCase } from './use-cases/delete-medical-record.use-case'
import { IMedicalRecordsRepository } from './repositories/medical-records.repository.interface'
import { MedicalRecordsRepository } from './repositories/medical-records.repository'
import { GenerateMedicalRecordPdfUseCase } from './use-cases/generate-medical-record-pdf.use-case'
import { MedicalRecordPdfBuilderService } from './services/medical-record-pdf-builder.service'
import { ValidateRecordDataService } from './services/validate-record-data.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecord]),
    CacheModule,
    AppointmentsModule,
    ProfessionalsModule,
    MedicalRecordTemplatesModule,
    ClinicsModule,
    PdfModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [
    CreateMedicalRecordUseCase,
    UpdateMedicalRecordUseCase,
    FindMedicalRecordByIdUseCase,
    FindMedicalRecordByAppointmentUseCase,
    FindMedicalRecordsByPatientUseCase,
    DeleteMedicalRecordUseCase,
    GenerateMedicalRecordPdfUseCase,
    MedicalRecordPdfBuilderService,
    ValidateRecordDataService,
    { provide: IMedicalRecordsRepository, useClass: MedicalRecordsRepository },
  ],
})
export class MedicalRecordsModule {}
