import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import {
  CreateMedicalRecordDto,
  MedicalRecordResponseDto,
  PaginatedMedicalRecordsResponseDto,
  UpdateMedicalRecordDto,
  UserRole,
} from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateMedicalRecordUseCase } from '../use-cases/create-medical-record.use-case'
import { UpdateMedicalRecordUseCase } from '../use-cases/update-medical-record.use-case'
import { FindMedicalRecordByIdUseCase } from '../use-cases/find-medical-record-by-id.use-case'
import { FindMedicalRecordByAppointmentUseCase } from '../use-cases/find-medical-record-by-appointment.use-case'
import { FindMedicalRecordsByPatientUseCase } from '../use-cases/find-medical-records-by-patient.use-case'
import { DeleteMedicalRecordUseCase } from '../use-cases/delete-medical-record.use-case'
import { GenerateMedicalRecordPdfUseCase } from '../use-cases/generate-medical-record-pdf.use-case'
import { MedicalRecordListQueryDto } from '../dto/medical-record-list-query.dto'

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(
    private readonly createMedicalRecordUseCase: CreateMedicalRecordUseCase,
    private readonly updateMedicalRecordUseCase: UpdateMedicalRecordUseCase,
    private readonly findMedicalRecordByIdUseCase: FindMedicalRecordByIdUseCase,
    private readonly findMedicalRecordByAppointmentUseCase: FindMedicalRecordByAppointmentUseCase,
    private readonly findMedicalRecordsByPatientUseCase: FindMedicalRecordsByPatientUseCase,
    private readonly deleteMedicalRecordUseCase: DeleteMedicalRecordUseCase,
    private readonly generateMedicalRecordPdfUseCase: GenerateMedicalRecordPdfUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordResponseDto> {
    return this.createMedicalRecordUseCase.execute(dto, currentUser)
  }

  @Get('by-appointment/:appointmentId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async findByAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.findMedicalRecordByAppointmentUseCase.execute(appointmentId, currentUser)
    if (!record) throw new NotFoundException('No medical record found for this appointment')
    return record
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByPatient(
    @Query() query: MedicalRecordListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordsResponseDto> {
    return this.findMedicalRecordsByPatientUseCase.execute(query.patientId!, query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordResponseDto> {
    return this.findMedicalRecordByIdUseCase.execute(id, currentUser)
  }

  // Baixar é ler: mesmos papéis e mesmo recorte do `GET /:id`, aplicado dentro
  // do use-case. Ao contrário de receita e atestado, este PDF não leva
  // assinatura — é cópia do registro, não documento atestado.
  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.generateMedicalRecordPdfUseCase.execute(id, currentUser)

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="prontuario-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordResponseDto> {
    return this.updateMedicalRecordUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteMedicalRecordUseCase.execute(id, currentUser)
  }
}
