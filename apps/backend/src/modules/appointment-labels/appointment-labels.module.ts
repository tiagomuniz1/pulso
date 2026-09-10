import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentLabelsController } from './controllers/appointment-labels.controller'
import { AppointmentLabel } from './entities/appointment-label.entity'
import { IAppointmentLabelsRepository } from './repositories/appointment-labels.repository.interface'
import { AppointmentLabelsRepository } from './repositories/appointment-labels.repository'
import { CreateAppointmentLabelUseCase } from './use-cases/create-appointment-label.use-case'
import { DeleteAppointmentLabelUseCase } from './use-cases/delete-appointment-label.use-case'
import { FindAppointmentLabelsUseCase } from './use-cases/find-appointment-labels.use-case'
import { GetAppointmentLabelUseCase } from './use-cases/get-appointment-label.use-case'
import { UpdateAppointmentLabelUseCase } from './use-cases/update-appointment-label.use-case'

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentLabel]), CacheModule],
  controllers: [AppointmentLabelsController],
  providers: [
    CreateAppointmentLabelUseCase,
    UpdateAppointmentLabelUseCase,
    FindAppointmentLabelsUseCase,
    GetAppointmentLabelUseCase,
    DeleteAppointmentLabelUseCase,
    { provide: IAppointmentLabelsRepository, useClass: AppointmentLabelsRepository },
  ],
  // Exporta o repositório, não um use-case: o módulo de consultas resolve o
  // rótulo em lote para cada página da agenda. É a mesma exceção já documentada
  // em vaccines.module.ts — a alternativa seria uma query crua sobre
  // `appointment_labels` de dentro de outro módulo, que é pior.
  exports: [IAppointmentLabelsRepository],
})
export class AppointmentLabelsModule {}
