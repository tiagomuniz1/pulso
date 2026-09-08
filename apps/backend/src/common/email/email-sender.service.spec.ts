jest.mock('nodemailer')
jest.mock('opossum')
jest.mock('@aws-sdk/client-sesv2')
jest.mock('../../config/env.config')

import * as nodemailer from 'nodemailer'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../config/env.config'
import { EmailSenderService, EmailMessage } from './email-sender.service'

const mockGetEnvConfig = getEnvConfig as jest.Mock

const baseEnv = {
  AWS_REGION: 'us-east-1',
  SMTP_HOST: undefined as string | undefined,
  SMTP_PORT: 587,
  SMTP_USER: undefined as string | undefined,
  SMTP_PASS: undefined as string | undefined,
  SMTP_FROM: 'noreply@pulso.center',
  EMAIL_PROVIDER: undefined as string | undefined,
}

const message: EmailMessage = {
  to: 'ana@clinica.com',
  subject: 'Defina sua senha — Clínica do Vale',
  html: '<p>link</p>',
  fromName: 'Clínica do Vale',
}

describe('EmailSenderService', () => {
  let mockBreaker: { fire: jest.Mock; fallback: jest.Mock; on: jest.Mock }
  let mockSendMail: jest.Mock
  let mockSesSend: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendMail = jest.fn().mockResolvedValue({})
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail })
    mockSesSend = jest.fn().mockResolvedValue({ MessageId: 'abc' })
    ;(SESv2Client as unknown as jest.Mock).mockImplementation(() => ({ send: mockSesSend }))
  })

  // O breaker é mockado como passa-direto: aqui interessa o transporte e o
  // desfecho, não o comportamento do opossum.
  function build(): EmailSenderService {
    let capturado: (m: EmailMessage) => Promise<unknown>
    ;(CircuitBreakerModule as unknown as jest.Mock).mockImplementation((fn: any) => {
      capturado = fn
      mockBreaker = {
        fire: jest.fn().mockImplementation((m: EmailMessage) => capturado(m)),
        fallback: jest.fn(),
        on: jest.fn(),
      }
      return mockBreaker
    })
    return new EmailSenderService()
  }

  describe('escolha do provedor', () => {
    // Produção não tem SMTP_HOST e autentica pela role da instância; local tem
    // host apontando para o mailpit. A regra é a presença do host.
    it('usa SES quando não há SMTP_HOST', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)

      await build().sendEmail(message)

      expect(mockSesSend).toHaveBeenCalled()
      expect(nodemailer.createTransport).not.toHaveBeenCalled()
    })

    it('usa SMTP quando há SMTP_HOST', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_HOST: 'localhost', SMTP_PORT: 1025 })

      await build().sendEmail(message)

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'localhost', port: 1025 }),
      )
      expect(mockSesSend).not.toHaveBeenCalled()
    })

    it('EMAIL_PROVIDER força SES mesmo com host presente', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_HOST: 'localhost', EMAIL_PROVIDER: 'ses' })

      await build().sendEmail(message)

      expect(mockSesSend).toHaveBeenCalled()
      expect(nodemailer.createTransport).not.toHaveBeenCalled()
    })

    it('EMAIL_PROVIDER força SMTP mesmo sem host — e então acusa a falta', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, EMAIL_PROVIDER: 'smtp' })

      await expect(build().sendEmail(message)).resolves.toEqual({
        sent: false,
        reason: 'not_configured',
      })
      expect(nodemailer.createTransport).not.toHaveBeenCalled()
    })

    it('ignora valor inválido de EMAIL_PROVIDER e volta à inferência', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, EMAIL_PROVIDER: 'sendgrid' })

      await build().sendEmail(message)

      expect(mockSesSend).toHaveBeenCalled()
    })
  })

  describe('SES', () => {
    beforeEach(() => mockGetEnvConfig.mockReturnValue(baseEnv))

    it('monta o remetente com o nome exibido e o endereço configurado', async () => {
      await build().sendEmail(message)

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          FromEmailAddress: 'Clínica do Vale <noreply@pulso.center>',
          Destination: { ToAddresses: ['ana@clinica.com'] },
        }),
      )
    })

    // Acentuação em assunto e corpo: sem UTF-8 explícito o SES entrega
    // caractere trocado.
    it('declara UTF-8 no assunto e no corpo', async () => {
      await build().sendEmail(message)

      const input = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0]
      expect(input.Content.Simple.Subject).toEqual({ Data: message.subject, Charset: 'UTF-8' })
      expect(input.Content.Simple.Body.Html).toEqual({ Data: message.html, Charset: 'UTF-8' })
    })

    it('inclui replyTo quando informado', async () => {
      await build().sendEmail({ ...message, replyTo: 'quem@solicitou.com' })

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({ ReplyToAddresses: ['quem@solicitou.com'] }),
      )
    })

    it('omite replyTo quando não informado', async () => {
      await build().sendEmail(message)

      const input = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0]
      expect(input).not.toHaveProperty('ReplyToAddresses')
    })

    it('usa a região configurada', async () => {
      await build().sendEmail(message)
      expect(SESv2Client).toHaveBeenCalledWith({ region: 'us-east-1' })
    })

    // Passar `region: undefined` anula a resolução do próprio SDK (variável de
    // ambiente, config do perfil) e o envio morre com "Region is missing".
    it('deixa o SDK resolver a região quando ela não está no ambiente', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, AWS_REGION: undefined })

      await build().sendEmail(message)

      expect(SESv2Client).toHaveBeenCalledWith({})
    })

    // Recriar o cliente a cada envio refaria a resolução da credencial da role.
    it('reaproveita o cliente entre envios', async () => {
      const service = build()
      await service.sendEmail(message)
      await service.sendEmail(message)

      expect(SESv2Client).toHaveBeenCalledTimes(1)
      expect(mockSesSend).toHaveBeenCalledTimes(2)
    })

    it('propaga a falha do SES para o breaker', async () => {
      mockSesSend.mockRejectedValue(new Error('MessageRejected'))

      await expect(build().sendEmail(message)).rejects.toThrow('MessageRejected')
    })

    it('acusa remetente ausente antes de chamar o SES', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_FROM: undefined })

      await expect(build().sendEmail(message)).resolves.toEqual({
        sent: false,
        reason: 'not_configured',
      })
      expect(mockSesSend).not.toHaveBeenCalled()
    })
  })

  describe('SMTP', () => {
    beforeEach(() =>
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_HOST: 'localhost', SMTP_PORT: 1025 }),
    )

    it('envia com remetente, destinatário, assunto e corpo', async () => {
      await build().sendEmail(message)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Clínica do Vale <noreply@pulso.center>',
          to: 'ana@clinica.com',
          subject: message.subject,
          html: message.html,
        }),
      )
    })

    it('inclui replyTo quando informado', async () => {
      await build().sendEmail({ ...message, replyTo: 'quem@solicitou.com' })
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'quem@solicitou.com' }),
      )
    })

    it('omite replyTo quando não informado', async () => {
      await build().sendEmail(message)
      expect(mockSendMail.mock.calls[0][0]).not.toHaveProperty('replyTo')
    })

    it('reporta sucesso quando o envio acontece', async () => {
      await expect(build().sendEmail(message)).resolves.toEqual({ sent: true })
    })
  })

  describe('circuito', () => {
    beforeEach(() => mockGetEnvConfig.mockReturnValue(baseEnv))

    // O fallback roda em qualquer falha, e quem chama precisa saber que não saiu.
    it('o fallback devolve não-enviado', () => {
      build()
      const fallback = mockBreaker.fallback.mock.calls[0][0] as () => unknown
      expect(fallback()).toEqual({ sent: false, reason: 'circuit_open' })
    })

    it('registra os ouvintes que expõem o erro real e o circuito aberto', () => {
      build()
      const eventos = mockBreaker.on.mock.calls.map((c) => c[0])
      expect(eventos).toContain('failure')
      expect(eventos).toContain('open')
    })
  })
})
