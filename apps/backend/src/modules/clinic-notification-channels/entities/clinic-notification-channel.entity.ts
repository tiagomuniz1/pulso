import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'

/**
 * A notification channel the PLATFORM_ADMIN enabled for a clinic.
 *
 * The row existing IS the enablement — there is no `isEnabled` column and no
 * soft delete, the same shape as `clinic_specialties`. A clinic with no row here
 * sends nothing, which is how the reminder cron became opt-in.
 */
@Entity('clinic_notification_channels')
export class ClinicNotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ type: 'varchar', length: 20 })
  channel: NotificationChannel

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
