import { Injectable } from '@nestjs/common'
import { getEnvConfig } from '../../../config/env.config'
import { EmailSenderService } from '../../../common/email/email-sender.service'
import { EmailSendResult } from '../../../common/email/email-send-result.type'
import {
  IAccessRequestEmailAdapter,
  ISendAccessRequestEmailParams,
} from './access-request-email.adapter.interface'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

@Injectable()
export class AccessRequestEmailAdapter implements IAccessRequestEmailAdapter {
  constructor(private readonly emailSender: EmailSenderService) {}

  async sendAccessRequestEmail(params: ISendAccessRequestEmailParams): Promise<EmailSendResult> {
    return this.emailSender.sendEmail({
      to: getEnvConfig().ACCESS_REQUEST_TO_EMAIL,
      fromName: 'Pulso',
      // Responder o e-mail fala direto com quem solicitou.
      replyTo: params.email,
      subject: `Solicitação de acesso — ${params.clinicName}`,
      html: this.buildHtml(params),
    })
  }

  private buildHtml(params: ISendAccessRequestEmailParams): string {
    return `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f2ee">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;background:#ffffff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
              <tr>
                <td style="font-family:sans-serif;padding:40px">
                  <p style="font-weight:700;font-size:18px;margin:0 0 24px;color:#111">Nova solicitação de acesso</p>
                  <p style="margin:0 0 12px;color:#333"><strong>Nome:</strong> ${escapeHtml(params.fullName)}</p>
                  <p style="margin:0 0 12px;color:#333"><strong>E-mail:</strong> ${escapeHtml(params.email)}</p>
                  <p style="margin:0 0 12px;color:#333"><strong>Clínica:</strong> ${escapeHtml(params.clinicName)}</p>
                  ${params.phone ? `<p style="margin:0 0 12px;color:#333"><strong>Telefone:</strong> ${escapeHtml(params.phone)}</p>` : ''}
                  <p style="color:#888;font-size:13px;margin:24px 0 0">Responda este e-mail para falar diretamente com quem solicitou.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
  }
}
