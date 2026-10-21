jest.mock('../services/users.service')

import { userService } from '../services/users.service'
import { sendSetPasswordEmailUseCase } from './send-set-password-email.use-case'

describe('sendSetPasswordEmailUseCase', () => {
  it('calls userService.sendSetPasswordEmail with id', async () => {
    ;(userService.sendSetPasswordEmail as jest.Mock).mockResolvedValue({ sent: true })

    await sendSetPasswordEmailUseCase('uuid-1')

    expect(userService.sendSetPasswordEmail).toHaveBeenCalledWith('uuid-1')
  })

  /**
   * O backend responde `503` quando o envio falha, em vez de confirmar uma
   * entrega que não aconteceu (ver `permissions.md`). O erro tem de chegar à
   * tela — engoli-lo aqui faria o diálogo dizer "link enviado" sobre nada.
   */
  it('propagates errors from userService.sendSetPasswordEmail', async () => {
    const error = { status: 503, title: 'Service Unavailable', detail: 'SMTP unreachable' }
    ;(userService.sendSetPasswordEmail as jest.Mock).mockRejectedValue(error)

    await expect(sendSetPasswordEmailUseCase('uuid-1')).rejects.toEqual(error)
  })
})
