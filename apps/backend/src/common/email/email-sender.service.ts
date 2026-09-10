import { Injectable, Logger } from '@nestjs/common'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import * as nodemailer from 'nodemailer'
import CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../config/env.config'
import { EMAIL_LOG_CODES, resolveEmailConfigStatus } from './email-config.util'
import { EmailSendResult } from './email-send-result.type'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  /** Nome exibido antes do endereço. O endereço em si é sempre `SMTP_FROM`. */
  fromName: string
  replyTo?: string
}

/**
 * O único lugar que envia e-mail.
 *
 * Os dois adapters (definição de senha e solicitação de acesso) traziam cópias
 * quase idênticas de breaker, checagem de configuração, transporte e log — e a
 * divergência entre elas já tinha custado: a mensagem do fallback dizia
 * "circuit breaker open" para qualquer falha em ambas. Aqui é uma cópia só, e
 * os adapters ficam com o que de fato lhes pertence: assunto e corpo.
 *
 * **Provedor:** em produção é a API do SES autenticada pela role da instância —
 * sem usuário nem senha em lugar nenhum, que é como a infraestrutura foi
 * preparada. Localmente é SMTP, apontando para o mailpit.
 */
@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name)
  private readonly breaker: CircuitBreaker<[EmailMessage], EmailSendResult>
  private sesClient: SESv2Client | null = null

  constructor() {
    this.breaker = new CircuitBreaker((message: EmailMessage) => this.send(message), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })

    // O `fallback` do opossum roda em QUALQUER falha, não só com o circuito
    // aberto — era por isso que erro de autenticação aparecia no log como
    // "circuit breaker open", mandando quem investiga para o lugar errado. Os
    // eventos separam os dois casos, e `failure` é o único ponto onde o erro
    // real do transporte aparece: o fallback substitui a exceção e ela se
    // perdia inteira.
    this.breaker.on('failure', (error) => {
      this.logger.error(`${EMAIL_LOG_CODES.SEND_FAILED}: falha ao enviar e-mail`, {
        context: EmailSenderService.name,
        code: EMAIL_LOG_CODES.SEND_FAILED,
        provider: resolveEmailConfigStatus().provider,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    this.breaker.on('open', () => {
      this.logger.error(
        `${EMAIL_LOG_CODES.CIRCUIT_OPEN}: circuito de e-mail aberto — envios suspensos por 30s`,
        { context: EmailSenderService.name, code: EMAIL_LOG_CODES.CIRCUIT_OPEN },
      )
    })

    this.breaker.fallback((): EmailSendResult => ({ sent: false, reason: 'circuit_open' }))
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    return this.breaker.fire(message)
  }

  private async send(message: EmailMessage): Promise<EmailSendResult> {
    const status = resolveEmailConfigStatus()

    // Sem o mínimo configurado não há o que tentar. Sai em nível de erro porque
    // é exatamente isso: alguém não recebeu o que devia, e nada na tela indica.
    if (!status.configured) {
      this.logger.error(
        `${EMAIL_LOG_CODES.NOT_CONFIGURED}: e-mail não enviado — faltam ${status.missing.join(', ')}`,
        {
          context: EmailSenderService.name,
          code: EMAIL_LOG_CODES.NOT_CONFIGURED,
          provider: status.provider,
          missing: status.missing,
        },
      )
      return { sent: false, reason: 'not_configured' }
    }

    const env = getEnvConfig()
    const from = `${message.fromName} <${env.SMTP_FROM}>`

    if (status.provider === 'ses') {
      await this.sendViaSes(message, from)
    } else {
      await this.sendViaSmtp(message, from)
    }

    return { sent: true }
  }

  private async sendViaSes(message: EmailMessage, from: string): Promise<void> {
    const env = getEnvConfig()

    // A região só é passada quando existe no ambiente. Passá-la `undefined`
    // anula a resolução do próprio SDK (variável de ambiente, config do
    // perfil) e o envio morre com "Region is missing" — foi o que aconteceu ao
    // testar isto pela primeira vez.
    //
    // Cliente reaproveitado entre envios: ele resolve a credencial da role da
    // instância e a mantém em cache, e recriar a cada envio refaria isso.
    this.sesClient ??= new SESv2Client(env.AWS_REGION ? { region: env.AWS_REGION } : {})

    await this.sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [message.to] },
        ...(message.replyTo ? { ReplyToAddresses: [message.replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: { Html: { Data: message.html, Charset: 'UTF-8' } },
          },
        },
      }),
    )
  }

  private async sendViaSmtp(message: EmailMessage, from: string): Promise<void> {
    const env = getEnvConfig()

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })

    await transporter.sendMail({
      from,
      to: message.to,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      subject: message.subject,
      html: message.html,
    })
  }
}
