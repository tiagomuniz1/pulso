import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, CreateMedicalRecordDto, MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { getPrimaryCouncilType } from '../../professionals/utils/get-primary-council-type.util'
import { FindTemplateByClinicAndIdUseCase } from '../../medical-record-templates/use-cases/find-template-by-clinic-and-id.use-case'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { ValidateRecordDataService } from '../services/validate-record-data.service'
import { MedicalRecord } from '../entities/medical-record.entity'
import { CacheService } from '../../../cache/cache.service'

export function toMedicalRecordResponse(record: MedicalRecord): MedicalRecordResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    patientName: record.patient.user.fullName,
    professionalId: record.professionalId,
    professionalName: record.professional.user.fullName,
    specialtyId: record.specialtyId,
    specialtyName: record.specialty?.name ?? null,
    // Sempre presentes: prontuário de consulta excluída não é devolvido.
    appointmentDate: record.appointment.date,
    appointmentStartTime: record.appointment.startTime,
    templateId: record.templateId,
    templateSchemaSnapshot: record.templateSchemaSnapshot,
    data: record.data,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

@Injectable()
export class CreateMedicalRecordUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicalRecordUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly findTemplateByClinicAndIdUseCase: FindTemplateByClinicAndIdUseCase,
    private readonly validateRecordDataService: ValidateRecordDataService,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateMedicalRecordDto, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== appointment.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    // A consulta manda no ESCOPO; o profissional escolhe QUAL modelo dentro dele.
    // Consulta generalista tem especialidade nula e o escopo passa a ser a
    // profissão do profissional que atende — um médico e uma nutricionista têm
    // cada um o seu generalista, nunca o do outro.
    const specialtyId = appointment.specialtyId
    let expectedCouncilType: CouncilType | undefined
    if (!specialtyId) {
      const appointmentProfessional = await this.professionalsRepository.findById(
        appointment.professionalId,
        clinicId,
      )
      if (!appointmentProfessional) throw new NotFoundException('Professional not found')
      expectedCouncilType = getPrimaryCouncilType(appointmentProfessional)
    }

    // Modelo de outra clínica e modelo excluído caem no mesmo 404 de propósito:
    // responder diferente revelaria a existência de registro alheio.
    const template = await this.findTemplateByClinicAndIdUseCase.execute(clinicId, dto.templateId)
    if (!template) throw new NotFoundException('Template not found')

    // 422 e não 404: o modelo existe e é legível, é a regra de negócio que
    // recusa usá-lo. Desativar é como a clínica aposenta um modelo sem apagar os
    // prontuários que já nasceram dele.
    if (!template.isActive) {
      throw new UnprocessableEntityException('Template is not active')
    }

    // Antes isto era trava de sanidade contra dado corrompido; agora que o
    // `templateId` vem do cliente, é A validação de entrada. Sem ela dava para
    // preencher uma consulta de ginecologia com o modelo de nutrição, e no ramo
    // generalista nem a FK composta protege (é MATCH SIMPLE, e os dois lados são
    // nulos).
    if (specialtyId) {
      if (template.specialtyId !== specialtyId) {
        throw new UnprocessableEntityException(
          'Template does not belong to the appointment specialty',
        )
      }
    } else if (template.specialtyId !== null || template.councilType !== expectedCouncilType) {
      throw new UnprocessableEntityException(
        'Template does not belong to the appointment profession',
      )
    }

    this.validateRecordDataService.validate(dto.data, template.fields)

    const existing = await this.medicalRecordsRepository.findByAppointment(dto.appointmentId, clinicId)
    if (existing) throw new ConflictException('A medical record already exists for this appointment')

    const record = await this.medicalRecordsRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      specialtyId,
      templateId: template.id,
      templateSchemaSnapshot: template.fields,
      data: dto.data,
      notes: dto.notes ?? null,
    })

    try {
      await this.cacheService.delByPattern(`medical_records:patient:${appointment.patientId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: 'CreateMedicalRecordUseCase' })
    }

    return toMedicalRecordResponse(record)
  }
}
