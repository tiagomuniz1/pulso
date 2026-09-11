import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { AppointmentResponseDto, SetAppointmentLabelDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentLabelsRepository } from '../../appointment-labels/repositories/appointment-labels.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { toAppointmentResponse } from '../appointment.mapper'

/**
 * Marca ou desmarca o rótulo de uma consulta.
 *
 * Uma rota só para os dois, e não `PATCH` + `DELETE`: é uma atribuição
 * idempotente única, e o seletor da tela tem "sem rótulo" como opção do mesmo
 * menu. `labelId: null` é desmarcar.
 */
@Injectable()
export class SetAppointmentLabelUseCase extends BaseUseCase {
  private readonly logger = new Logger(SetAppointmentLabelUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly appointmentLabelsRepository: IAppointmentLabelsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: SetAppointmentLabelDto,
    currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || appointment.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to manage this appointment')
      }
    }

    if (dto.labelId !== null) {
      const label = await this.appointmentLabelsRepository.findById(dto.labelId, clinicId)
      // 422 e não 404: o recurso da URL é a consulta; id ruim no corpo é entrada
      // inválida para ela. E rótulo inexistente e de outra clínica respondem
      // igual, para não revelar o que existe noutro tenant.
      if (!label) throw new UnprocessableEntityException('Label not found in this clinic')
      if (!label.isActive) throw new UnprocessableEntityException('Label is inactive')
    }

    // Sem guarda de status de propósito: reetiquetar consulta concluída ou
    // cancelada é inofensivo, e às vezes é justamente o que se quer.
    let updated
    try {
      updated = await this.appointmentsRepository.update(id, { labelId: dto.labelId })
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: SetAppointmentLabelUseCase.name })
    }

    // Relê para trazer a relação do rótulo carregada — o `update` devolve a
    // entidade salva, sem o join.
    const withLabel = (await this.appointmentsRepository.findById(id, clinicId)) ?? updated

    const [professionalName, patientName, specialtyName] = await Promise.all([
      this.fetchProfessionalName(withLabel.professionalId),
      this.fetchPatientName(withLabel.patientId),
      this.fetchSpecialtyName(withLabel.specialtyId),
    ])

    return toAppointmentResponse(withLabel, {
      professionalName,
      patientName,
      specialtyName,
      seriesTotalOccurrences: withLabel.series?.createdOccurrenceCount ?? null,
    })
  }

  private async fetchSpecialtyName(specialtyId: string | null): Promise<string | null> {
    if (!specialtyId) return null
    const rows: Array<{ name: string }> = await this.dataSource
      .createQueryBuilder()
      .select('s.name', 'name')
      .from('specialties', 's')
      .where('s.id = :specialtyId', { specialtyId })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.name ?? null
  }

  private async fetchProfessionalName(professionalId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :professionalId', { professionalId })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }

  private async fetchPatientName(patientId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('patients', 'p')
      .innerJoin('users', 'u', 'u.id = p.user_id AND u.deleted_at IS NULL')
      .where('p.id = :patientId', { patientId })
      .andWhere('p.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }
}
