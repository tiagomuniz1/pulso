import { EmailSenderService } from '../../../common/email/email-sender.service'
import { SmtpEmailAdapter } from './smtp-email.adapter'

// O adapter ficou fino: ele monta assunto e corpo. Provedor, circuito e log
// vivem em EmailSenderService, que tem spec própria.
describe('SmtpEmailAdapter', () => {
  const emailSender = { sendEmail: jest.fn() } as unknown as jest.Mocked<EmailSenderService>
  let adapter: SmtpEmailAdapter

  const baseParams = {
    to: 'ana@clinica.com',
    recipientName: 'Ana Costa',
    link: 'https://clinica.pulso.center/set-password?token=abc',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(emailSender.sendEmail as jest.Mock).mockResolvedValue({ sent: true })
    adapter = new SmtpEmailAdapter(emailSender)
  })

  it('repassa o desfecho do envio, sem inventar sucesso', async () => {
    ;(emailSender.sendEmail as jest.Mock).mockResolvedValue({ sent: false, reason: 'not_configured' })

    await expect(adapter.sendSetPasswordEmail(baseParams)).resolves.toEqual({
      sent: false,
      reason: 'not_configured',
    })
  })

  it('envia para o destinatário com assunto da clínica', async () => {
    await adapter.sendSetPasswordEmail({ ...baseParams, clinicName: 'Clínica do Vale' })

    expect(emailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@clinica.com',
        fromName: 'Clínica do Vale',
        subject: 'Defina sua senha — Clínica do Vale',
      }),
    )
  })

  // Platform admin não tem clínica: o e-mail sai como Pulso, não em branco.
  it('cai para Pulso quando não há clínica', async () => {
    await adapter.sendSetPasswordEmail(baseParams)

    expect(emailSender.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ fromName: 'Pulso', subject: 'Defina sua senha — Pulso' }),
    )
  })

  it('põe o link no corpo', async () => {
    await adapter.sendSetPasswordEmail(baseParams)

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).toContain(baseParams.link)
    expect(html).toContain('Ana Costa')
  })

  it('usa o logotipo da clínica quando existe', async () => {
    await adapter.sendSetPasswordEmail({ ...baseParams, clinicLogoUrl: 'https://cdn/logo.png' })

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).toContain('https://cdn/logo.png')
  })

  it('cai para o nome da clínica em texto quando não há logotipo', async () => {
    await adapter.sendSetPasswordEmail({ ...baseParams, clinicName: 'Clínica do Vale' })

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).not.toContain('<img')
    expect(html).toContain('Clínica do Vale')
  })

  it('aplica a cor de acento da clínica', async () => {
    await adapter.sendSetPasswordEmail({ ...baseParams, accentColor: '#5A0E20', accentSoftColor: '#F8E3E9' })

    const { html } = (emailSender.sendEmail as jest.Mock).mock.calls[0][0]
    expect(html).toContain('#5A0E20')
    expect(html).toContain('#F8E3E9')
  })
})
