import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentReminder } from './entities/appointment-reminder.entity'
import { AppointmentRemindersRepository } from './repositories/appointment-reminders.repository'
import { IAppointmentRemindersRepository } from './repositories/appointment-reminders.repository.interface'
import { InfobipWhatsAppAdapter } from './adapters/infobip-whatsapp.adapter'
import { IWhatsAppReminderAdapter } from './adapters/whatsapp-reminder.adapter.interface'
import { NotificationChannelResolver } from './adapters/notification-channel.resolver'
import { SendAppointmentRemindersUseCase } from './use-cases/send-appointment-reminders.use-case'
import { RemindersScheduler } from './reminders.scheduler'

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentReminder]), CacheModule],
  providers: [
    SendAppointmentRemindersUseCase,
    RemindersScheduler,
    { provide: IAppointmentRemindersRepository, useClass: AppointmentRemindersRepository },
    { provide: IWhatsAppReminderAdapter, useClass: InfobipWhatsAppAdapter },
    NotificationChannelResolver,
  ],
})
export class RemindersModule {}
