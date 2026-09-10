import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  AppointmentLabelResponseDto,
  CreateAppointmentLabelDto,
  PaginatedAppointmentLabelsResponseDto,
  UpdateAppointmentLabelDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AppointmentLabelListQueryDto } from '../dto/appointment-label-list-query.dto'
import { CreateAppointmentLabelUseCase } from '../use-cases/create-appointment-label.use-case'
import { DeleteAppointmentLabelUseCase } from '../use-cases/delete-appointment-label.use-case'
import { FindAppointmentLabelsUseCase } from '../use-cases/find-appointment-labels.use-case'
import { GetAppointmentLabelUseCase } from '../use-cases/get-appointment-label.use-case'
import { UpdateAppointmentLabelUseCase } from '../use-cases/update-appointment-label.use-case'

@Controller('appointment-labels')
export class AppointmentLabelsController {
  constructor(
    private readonly createAppointmentLabelUseCase: CreateAppointmentLabelUseCase,
    private readonly updateAppointmentLabelUseCase: UpdateAppointmentLabelUseCase,
    private readonly findAppointmentLabelsUseCase: FindAppointmentLabelsUseCase,
    private readonly getAppointmentLabelUseCase: GetAppointmentLabelUseCase,
    private readonly deleteAppointmentLabelUseCase: DeleteAppointmentLabelUseCase,
  ) {}

  // O catálogo é da clínica e gerir é do ADMIN — um rótulo renomeado muda a
  // agenda de todo mundo. Ler é dos três perfis: o profissional marca o rótulo
  // na própria consulta (rota `PATCH /appointments/:id/label`) e a recepção
  // precisa do catálogo para o filtro da agenda.
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreateAppointmentLabelDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentLabelResponseDto> {
    return this.createAppointmentLabelUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findAll(
    @Query() query: AppointmentLabelListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedAppointmentLabelsResponseDto> {
    return this.findAppointmentLabelsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentLabelResponseDto> {
    return this.getAppointmentLabelUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentLabelDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentLabelResponseDto> {
    return this.updateAppointmentLabelUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser): Promise<void> {
    return this.deleteAppointmentLabelUseCase.execute(id, currentUser)
  }
}
