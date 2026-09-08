import {
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { SendSetPasswordEmailUseCase } from '../../auth/use-cases/send-set-password-email.use-case'
import { IUsersRepository } from '../repositories/users.repository.interface'
import { SendUserSetPasswordEmailUseCase } from '../use-cases/send-user-set-password-email.use-case'

const clinicId = 'clinic-uuid'
const adminUser: ICurrentUser = { id: 'admin-uuid', role: UserRole.ADMIN, clinicId }

const makeUser = (overrides = {}) => ({
  id: 'user-uuid',
  fullName: 'Ana Recepção',
  email: 'ana@clinica.com',
  role: UserRole.USER,
  isActive: true,
  clinicId,
  ...overrides,
})

const usersRepository = { findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>
const sendEmail = { execute: jest.fn() } as unknown as jest.Mocked<SendSetPasswordEmailUseCase>

describe('SendUserSetPasswordEmailUseCase', () => {
  let useCase: SendUserSetPasswordEmailUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SendUserSetPasswordEmailUseCase({} as DataSource, usersRepository, sendEmail)
    ;(usersRepository.findById as jest.Mock).mockResolvedValue(makeUser())
    ;(sendEmail.execute as jest.Mock).mockResolvedValue({ sent: true })
  })

  it('envia e confirma quando o e-mail sai', async () => {
    await expect(useCase.execute('user-uuid', adminUser)).resolves.toEqual({ sent: true })
    expect(sendEmail.execute).toHaveBeenCalledWith('user-uuid', clinicId)
  })

  // O recorte por clínica é do repositório: sem o clinicId, um uuid vazado
  // permitiria disparar link para usuário de outro inquilino.
  it('busca o usuário dentro da clínica de quem pediu', async () => {
    await useCase.execute('user-uuid', adminUser)
    expect(usersRepository.findById).toHaveBeenCalledWith('user-uuid', clinicId)
  })

  it('404 quando o usuário não existe na clínica', async () => {
    ;(usersRepository.findById as jest.Mock).mockResolvedValue(null)
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(NotFoundException)
    expect(sendEmail.execute).not.toHaveBeenCalled()
  })

  // PATIENT não faz login: o link levaria a definir uma senha inútil.
  it('422 para paciente', async () => {
    ;(usersRepository.findById as jest.Mock).mockResolvedValue(makeUser({ role: UserRole.PATIENT }))
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(UnprocessableEntityException)
    expect(sendEmail.execute).not.toHaveBeenCalled()
  })

  // Conta inativa faz o link morrer no login com "conta inativa", e quem
  // clicou não entende. Ativar primeiro.
  it('422 para conta desativada', async () => {
    ;(usersRepository.findById as jest.Mock).mockResolvedValue(makeUser({ isActive: false }))
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(UnprocessableEntityException)
    expect(sendEmail.execute).not.toHaveBeenCalled()
  })

  // O ponto da mudança inteira: não responder sucesso quando o e-mail não saiu.
  it('503 quando o e-mail não está configurado, com motivo legível', async () => {
    ;(sendEmail.execute as jest.Mock).mockResolvedValue({ sent: false, reason: 'not_configured' })

    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(ServiceUnavailableException)
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(/não está configurado/)
  })

  it('503 quando o envio falha', async () => {
    ;(sendEmail.execute as jest.Mock).mockResolvedValue({ sent: false, reason: 'send_failed' })
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(/Tente novamente/)
  })

  it('503 quando o circuito está aberto', async () => {
    ;(sendEmail.execute as jest.Mock).mockResolvedValue({ sent: false, reason: 'circuit_open' })
    await expect(useCase.execute('user-uuid', adminUser)).rejects.toThrow(ServiceUnavailableException)
  })

  it('PLATFORM_ADMIN opera sem clínica', async () => {
    const platformAdmin: ICurrentUser = { id: 'p', role: UserRole.PLATFORM_ADMIN, clinicId: null }
    await useCase.execute('user-uuid', platformAdmin)
    expect(usersRepository.findById).toHaveBeenCalledWith('user-uuid', null)
    expect(sendEmail.execute).toHaveBeenCalledWith('user-uuid', null)
  })
})
