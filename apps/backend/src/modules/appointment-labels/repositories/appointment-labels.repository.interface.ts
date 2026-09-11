import { QueryRunner } from 'typeorm'
import { AppointmentLabel } from '../entities/appointment-label.entity'

export abstract class IAppointmentLabelsRepository {
  abstract findAll(
    clinicId: string,
    page: number,
    limit: number,
    isActive?: boolean,
  ): Promise<[AppointmentLabel[], number]>
  abstract findById(id: string, clinicId: string): Promise<AppointmentLabel | null>
  /** Resolve em lote os rótulos de uma página de consultas. */
  abstract findByIds(ids: string[], clinicId: string): Promise<AppointmentLabel[]>
  abstract create(
    data: Partial<AppointmentLabel>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<AppointmentLabel>
  abstract update(
    id: string,
    data: Partial<AppointmentLabel>,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<AppointmentLabel>
  abstract delete(id: string, clinicId: string, queryRunner?: QueryRunner): Promise<void>
}
