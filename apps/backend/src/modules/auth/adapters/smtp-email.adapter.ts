import { Injectable } from '@nestjs/common'
import { EmailSenderService } from '../../../common/email/email-sender.service'
import { EmailSendResult } from '../../../common/email/email-send-result.type'
import { IEmailAdapter, ISendSetPasswordEmailParams } from './email.adapter.interface'

/**
 * O e-mail "defina sua senha".
 *
 * O nome do arquivo virou herança: o transporte não é mais necessariamente
 * SMTP — em produção é a API do SES. O adapter monta assunto e corpo; provedor,
 * circuito e log vivem em `EmailSenderService`.
 */
@Injectable()
export class SmtpEmailAdapter implements IEmailAdapter {
  constructor(private readonly emailSender: EmailSenderService) {}

  async sendSetPasswordEmail(params: ISendSetPasswordEmailParams): Promise<EmailSendResult> {
    const clinicName = params.clinicName ?? 'Pulso'

    return this.emailSender.sendEmail({
      to: params.to,
      fromName: clinicName,
      subject: `Defina sua senha — ${clinicName}`,
      html: this.buildHtml(params.recipientName, params.link, {
        clinicName,
        clinicLogoUrl: params.clinicLogoUrl ?? null,
        accentColor: params.accentColor ?? '#0066cc',
        accentSoftColor: params.accentSoftColor ?? '#e8f0fe',
      }),
    })
  }

  private buildHtml(
    recipientName: string,
    link: string,
    branding: { clinicName: string; clinicLogoUrl: string | null; accentColor: string; accentSoftColor: string },
  ): string {
    const { clinicName, clinicLogoUrl, accentColor, accentSoftColor } = branding
    const header = clinicLogoUrl
      ? `<img src="${clinicLogoUrl}" alt="${clinicName}" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 24px">`
      : `<p style="font-weight:700;font-size:18px;margin:0 0 24px;color:#111;text-align:center">${clinicName}</p>`

    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${accentSoftColor}">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;background:#ffffff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
              <tr>
                <td style="font-family:sans-serif;padding:40px">
                  ${header}
                  <p style="margin:0 0 12px;color:#333">Olá, ${recipientName}.</p>
                  <p style="margin:0 0 24px;color:#333">Sua conta foi criada na plataforma ${clinicName}. Clique no botão abaixo para definir sua senha e acessar o sistema.</p>
                  <p style="margin:32px 0;text-align:center">
                    <a href="${link}"
                       style="background:${accentColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
                      Definir minha senha
                    </a>
                  </p>
                  <p style="color:#888;font-size:13px;margin:0 0 8px">
                    Este link é válido por 72 horas. Se você não esperava este e-mail, ignore-o.
                  </p>
                  <p style="color:#888;font-size:13px;margin:0">
                    Ou copie e cole este endereço no navegador:<br/>
                    <span style="word-break:break-all">${link}</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
  }
}
