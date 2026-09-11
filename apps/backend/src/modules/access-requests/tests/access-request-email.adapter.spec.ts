jest.mock('../../../config/env.config')

import { getEnvConfig } from '../../../config/env.config'
import { EmailSenderService } from '../../../common/email/email-sender.service'
import { AccessRequestEmailAdapter } from '../adapters/access-request-email.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock

// O adapter ficou fino: monta assunto e corpo. Provedor, circuito e log vivem
// em EmailSenderService, que tem spec própria.
describe('AccessRequestEmailAdapter', () => {
  const emailSender = { sendEmail: jest.fn() } as unknown as jest.Mocked<EmailSenderService>
  let adapter: AccessRequestEmailAdapter

  const baseParams = {
    fullName: 'Ana Costa',
    email: 'ana@clinica.com',
    clinicName: 'Clínica do Vale',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEnvConfig.mockReturnValue({ ACCESS_REQUEST_TO_EMAIL: 'contato@pulso.center' })
    ;(emailSender.sendEmail as jest.Mock).mockResolvedValue({ sent: true })
    adapter = new AccessRequestEmailAdapter(emailSender)
  })

  it('repassa o desfecho do envio, sem inventar sucesso', async () => {
    ;(emailSender.sendEmail as jest.Mock).mockResolvedValue({ sent: false, reason: 'not_configured' })

    await expect(adapter.sendAccessRequestEmail(baseParams)).resolves.toEqual({
      sent: false,
      reason: 'not_configured',
    })
  })

  // Responder o e-mail fala direto com quem solicitou, não com a plataforma.
  it('envia para o destinatário configurado, com replyTo de quem solicitou', async () => {
    await adapter.sendAccessRequestEmail(baseParams)

    expect(emailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'contato@pulso.center',
        replyTo: 'ana@clinica.com',
        fromName: 'Pulso',
        subject: 'Solicitação de acesso — Clínica do Vale',
      }),
    )
  })

  it('inclui nome, e-mail e clínica no corpo', async () => {
    await adapter.sendAccessRequestEmail(baseParams)

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).toContain('Ana Costa')
    expect(html).toContain('ana@clinica.com')
    expect(html).toContain('Clínica do Vale')
  })

  it('inclui o telefone quando informado', async () => {
    await adapter.sendAccessRequestEmail({ ...baseParams, phone: '11999998888' })

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).toContain('11999998888')
    expect(html).toContain('Telefone')
  })

  it('omite a linha de telefone quando não informado', async () => {
    await adapter.sendAccessRequestEmail(baseParams)

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).not.toContain('Telefone')
  })

  // O formulário é público: o que o solicitante digita não pode virar markup.
  it('escapa HTML dos campos vindos do solicitante', async () => {
    await adapter.sendAccessRequestEmail({
      ...baseParams,
      fullName: '<script>alert(1)</script>',
      clinicName: 'Clínica "A" & B',
    })

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;A&quot;')
    expect(html).toContain('&amp;')
  })
})
