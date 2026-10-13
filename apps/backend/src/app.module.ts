import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from './database/database.module'
import { CacheModule } from './cache/cache.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { PatientsModule } from './modules/patients/patients.module'
import { ProfessionalsModule } from './modules/professionals/professionals.module'
import { SchedulesModule } from './modules/schedules/schedules.module'
import { AppointmentLabelsModule } from './modules/appointment-labels/appointment-labels.module'
import { AppointmentsModule } from './modules/appointments/appointments.module'
import { SpecialtiesModule } from './modules/specialties/specialties.module'
import { ClinicsModule } from './modules/clinics/clinics.module'
import { ClinicSpecialtiesModule } from './modules/clinic-specialties/clinic-specialties.module'
import { ClinicNotificationChannelsModule } from './modules/clinic-notification-channels/clinic-notification-channels.module'
import { ThemesModule } from './modules/themes/themes.module'
import { ScheduleExceptionsModule } from './modules/schedule-exceptions/schedule-exceptions.module'
import { MedicalRecordCanonicalFieldsModule } from './modules/medical-record-canonical-fields/medical-record-canonical-fields.module'
import { MedicalRecordTemplatesModule } from './modules/medical-record-templates/medical-record-templates.module'
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module'
import { MedicationsModule } from './modules/medications/medications.module'
import { VaccinesModule } from './modules/vaccines/vaccines.module'
import { VaccinationsModule } from './modules/vaccinations/vaccinations.module'
import { VaccineSchedulesModule } from './modules/vaccine-schedules/vaccine-schedules.module'
import { VaccineIndicationsModule } from './modules/vaccine-indications/vaccine-indications.module'
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module'
import { PrescriptionTemplatesModule } from './modules/prescription-templates/prescription-templates.module'
import { MedicalCertificatesModule } from './modules/medical-certificates/medical-certificates.module'
import { ExamsModule } from './modules/exams/exams.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { AccessRequestsModule } from './modules/access-requests/access-requests.module'
import { ConsultationPhotosModule } from './modules/consultation-photos/consultation-photos.module'
import { RemindersModule } from './modules/reminders/reminders.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { RolesGuard } from './modules/auth/guards/roles.guard'

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60000, limit: 300 }],
      // A suíte de integração dispara milhares de requisições do mesmo IP, e
      // todo spec tem um helper `loginAs` — com o limite de 10/60s do login, a
      // suíte inteira cairia em 429 (medido: 873 falhas). Desligar por flag é o
      // que permite manter o guard registrado em produção sem tornar a suíte
      // refém do contador.
      //
      // A flag é explícita, não derivada de NODE_ENV, justamente para o spec de
      // throttling poder religá-la e provar que o 429 acontece.
      skipIf: () => process.env.THROTTLE_DISABLED === 'true',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    ProfessionalsModule,
    SchedulesModule,
    AppointmentsModule,
    AppointmentLabelsModule,
    SpecialtiesModule,
    ClinicsModule,
    ClinicSpecialtiesModule,
    ClinicNotificationChannelsModule,
    ThemesModule,
    ScheduleExceptionsModule,
    MedicalRecordCanonicalFieldsModule,
    MedicalRecordTemplatesModule,
    MedicalRecordsModule,
    MedicationsModule,
    VaccinesModule,
    VaccinationsModule,
    VaccineSchedulesModule,
    VaccineIndicationsModule,
    PrescriptionsModule,
    PrescriptionTemplatesModule,
    MedicalCertificatesModule,
    ExamsModule,
    DashboardModule,
    AccessRequestsModule,
    ConsultationPhotosModule,
    RemindersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    // Antes deste registro os @Throttle dos endpoints de auth eram decorativos:
    // o módulo estava importado, mas sem guard global nada era aplicado. Na web
    // isso era atenuado pelo navegador e pelo captcha após 2 falhas; com os
    // endpoints de token para cliente nativo, seria força bruta sem freio.
    //
    // Vem antes do JwtAuthGuard de propósito — barrar a enxurrada custa menos
    // que verificar a assinatura de cada token dela.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
