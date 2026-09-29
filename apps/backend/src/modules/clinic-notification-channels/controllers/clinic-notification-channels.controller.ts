import { Controller, Delete, Get, HttpCode, Param, ParseEnumPipe, Post } from '@nestjs/common'
import { ClinicNotificationChannelResponseDto, NotificationChannel, UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { DisableClinicNotificationChannelUseCase } from '../use-cases/disable-clinic-notification-channel.use-case'
import { EnableClinicNotificationChannelUseCase } from '../use-cases/enable-clinic-notification-channel.use-case'
import { FindClinicNotificationChannelsUseCase } from '../use-cases/find-clinic-notification-channels.use-case'

@Controller('clinics/:clinicId/notification-channels')
export class ClinicNotificationChannelsController {
  constructor(
    private readonly findClinicNotificationChannelsUseCase: FindClinicNotificationChannelsUseCase,
    private readonly enableClinicNotificationChannelUseCase: EnableClinicNotificationChannelUseCase,
    private readonly disableClinicNotificationChannelUseCase: DisableClinicNotificationChannelUseCase,
  ) {}

  // ADMIN reads so the clinic can see what is active for it; only the
  // PLATFORM_ADMIN decides. Same split as clinic-specialties.
  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN)
  findAll(@Param('clinicId') clinicId: string): Promise<ClinicNotificationChannelResponseDto[]> {
    return this.findClinicNotificationChannelsUseCase.execute(clinicId)
  }

  @Post(':channel')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  enable(
    @Param('clinicId') clinicId: string,
    // ParseEnumPipe turns an unknown channel into 400 at the edge, so an
    // unsupported value never reaches the DB as a varchar nobody can dispatch.
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ): Promise<ClinicNotificationChannelResponseDto> {
    return this.enableClinicNotificationChannelUseCase.execute(clinicId, channel)
  }

  @Delete(':channel')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  disable(
    @Param('clinicId') clinicId: string,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
  ): Promise<void> {
    return this.disableClinicNotificationChannelUseCase.execute(clinicId, channel)
  }
}
