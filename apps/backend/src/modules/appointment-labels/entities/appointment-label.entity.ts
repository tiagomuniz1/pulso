import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { AppointmentLabelColor } from '@app/shared'

/**
 * Rótulo de consulta: o catálogo por clínica que colore a agenda.
 *
 * `clinic_id` é coluna nua, sem `@ManyToOne` para `Clinic`, como nos demais
 * módulos recentes.
 */
@Entity('appointment_labels')
export class AppointmentLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'clinic_id', type: 'uuid' })
  clinicId: string

  @Column({ length: 40 })
  name: string

  // `type` explícito: a propriedade é um enum TS, e sem isto o TypeORM infere
  // "Object" e derruba o backend ao subir.
  @Column({ type: 'varchar', length: 30 })
  color: AppointmentLabelColor

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
