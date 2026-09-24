import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'
import { KinshipType, PatientGender } from '@app/shared'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => Clinic, { eager: false })
  @JoinColumn({ name: 'clinic_id' })
  clinic: Clinic

  @Column({ name: 'clinic_id' })
  clinicId: string

  @Column({ name: 'document_number', type: 'char', length: 11, nullable: true })
  documentNumber: string | null

  @Column({ name: 'phone_number' })
  phoneNumber: string

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string

  @Column({ type: 'varchar' })
  gender: PatientGender

  @ManyToOne(() => Patient, { eager: false, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_patient_id' })
  responsiblePatient: Patient | null

  @Column({ name: 'responsible_patient_id', type: 'uuid', nullable: true })
  responsiblePatientId: string | null

  @Column({ name: 'kinship_type', type: 'varchar', length: 20, nullable: true })
  kinshipType: KinshipType | null

  // Endereço: 8 colunas achatadas, espelhando `clinics`. O contrato da API é um
  // objeto `address` aninhado — o achatamento vive no repositório e a remontagem
  // no mapper de resposta. `type` explícito em todas porque são `string | null`.
  @Column({ name: 'address_street', type: 'varchar', length: 255, nullable: true })
  addressStreet: string | null

  @Column({ name: 'address_number', type: 'varchar', length: 20, nullable: true })
  addressNumber: string | null

  @Column({ name: 'address_complement', type: 'varchar', length: 100, nullable: true })
  addressComplement: string | null

  @Column({ name: 'address_neighborhood', type: 'varchar', length: 100, nullable: true })
  addressNeighborhood: string | null

  @Column({ name: 'address_city', type: 'varchar', length: 100, nullable: true })
  addressCity: string | null

  @Column({ name: 'address_state', type: 'varchar', length: 2, nullable: true })
  addressState: string | null

  @Column({ name: 'address_zip_code', type: 'varchar', length: 9, nullable: true })
  addressZipCode: string | null

  @Column({ name: 'address_country', type: 'varchar', length: 2, nullable: true })
  addressCountry: string | null

  // Origem externa: preenchido só por importação (ver
  // `database/seeds/iclinic/`). Nulo em tudo que nasce pela tela.
  @Column({ name: 'external_source', type: 'varchar', length: 20, nullable: true })
  externalSource: string | null

  @Column({ name: 'external_id', type: 'varchar', length: 64, nullable: true })
  externalId: string | null

  @VersionColumn()
  version: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null
}
