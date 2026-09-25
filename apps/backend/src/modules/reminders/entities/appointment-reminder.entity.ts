import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'
import { NotificationChannel } from '@app/shared'

export type ReminderOffsetLabel = string // e.g. '24h' | '3h'
// 'pending' is the provisional state right after the slot is claimed, before the
// send outcome is known; it is finalized to sent / failed / skipped.
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/**
 * Append-only operational log of appointment reminders. One row per
 * (appointment, offset, channel) — the unique constraint is the send-once
 * guarantee (claimed via INSERT ... ON CONFLICT DO NOTHING). Not a user-facing
 * business entity, so there is no soft-delete.
 *
 * The channel belongs in the key: a clinic can have several enabled at once, and
 * without it the first channel to send would claim the slot and the rest would
 * read as "already handled" — silently, because a null claim is indistinguishable
 * from another instance having won the race.
 */
@Entity('appointment_reminders')
@Unique('UQ_appointment_reminders_appointment_offset_channel', [
  'appointmentId',
  'offsetLabel',
  'channel',
])
export class AppointmentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index('IDX_appointment_reminders_appointment_id')
  @Column({ name: 'appointment_id' })
  appointmentId: string

  @Column({ name: 'clinic_id' })
  clinicId: string

  @Column({ name: 'offset_label', type: 'varchar', length: 10 })
  offsetLabel: ReminderOffsetLabel

  @Column({ type: 'varchar', length: 20 })
  channel: NotificationChannel

  @Column({ type: 'varchar', length: 20 })
  status: ReminderStatus

  @Column({ name: 'provider_message_id', type: 'varchar', length: 255, nullable: true })
  providerMessageId: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
