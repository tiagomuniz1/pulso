import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../repositories/users.repository.interface'

@Injectable()
export class SendUserSetPasswordEmailUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    @Inject(forwardRef(() => SendSetPasswordEmailUseCase))
    private readonly sendSetPasswordEmailUseCase: SendSetPasswordEmailUseCase,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<{ sent: true }> {
    const clinicId = currentUser.clinicId ?? null

    const user = await this.usersRepository.findById(id, clinicId)
    if (!user) throw new NotFoundException('User not found')

    // PATIENT não faz login (permissions.md, "Regras Globais"): o link levaria
    // a pessoa a definir uma senha que nunca vai poder usar.
    if (user.role === UserRole.PATIENT) {
      throw new UnprocessableEntityException('Patients cannot access the system')
    }

    // Conta desativada também não entra, então o link morre na tela de login
    // com "conta inativa" — e quem clicou não entende por quê. Ativar primeiro.
    if (!user.isActive) {
      throw new UnprocessableEntityException('Activate the user before sending the link')
    }

    const result = await this.sendSetPasswordEmailUseCase.execute(user.id, clinicId)

    // O envio não pode responder sucesso quando o e-mail não saiu. Era
    // justamente isso que acontecia: o adapter pulava o envio em silêncio e
    // quem chamou seguia como se tivesse enviado.
    if (!result.sent) {
      throw new ServiceUnavailableException(
        result.reason === 'not_configured'
          ? 'O envio de e-mail não está configurado no sistema. Fale com o suporte.'
          : 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.',
      )
    }

    return { sent: true }
  }
}
