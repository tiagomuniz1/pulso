import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalRecordResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { toMedicalRecordResponse } from './create-medical-record.use-case'

@Injectable()
export class FindMedicalRecordByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<MedicalRecordResponseDto> {
    const clinicId = currentUser.clinicId!

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    // O PROFESSIONAL lê o que escreveu MAIS o que foi escrito nas especialidades
    // que ele exerce — a mesma regra que `findByPatient` aplica na listagem. Antes
    // aqui era só o que ele escreveu, e a divergência tinha consequência visível:
    // o histórico do paciente listava o prontuário do colega da mesma
    // especialidade, e abri-lo caía em 404 com o diálogo vazio.
    //
    // Continua `NotFound` e não `Forbidden`: quem não alcança o prontuário também
    // não deve descobrir que ele existe.
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      const isAuthor = professional?.id === record.professionalId
      const exercisesSpecialty =
        record.specialtyId !== null &&
        (professional?.professionalSpecialties ?? []).some(
          (professionalSpecialty) => professionalSpecialty.specialtyId === record.specialtyId,
        )

      if (!professional || (!isAuthor && !exercisesSpecialty)) {
        throw new NotFoundException('Medical record not found')
      }
    }

    return toMedicalRecordResponse(record)
  }
}
