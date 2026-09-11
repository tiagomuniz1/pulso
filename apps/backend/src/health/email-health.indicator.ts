import { Injectable } from '@nestjs/common'
import { resolveEmailConfigStatus } from '../common/email/email-config.util'

export interface EmailHealthDetails {
  status: 'up' | 'down'
  /** SES pela role da instância, ou SMTP. Primeira pergunta ao diagnosticar. */
  provider: 'ses' | 'smtp'
  configured: boolean
  host: string | null
  port: number
  from: string
  missing?: string[]
  warning?: string
}

export interface EmailHealthResponse {
  status: 'ok' | 'error'
  details: { email: EmailHealthDetails }
}

/**
 * Diagnóstico da configuração de e-mail.
 *
 * **Não entra no `GET /health`.** Aquele endpoint é o healthcheck do container
 * (`docker-compose.prod.yml`): qualquer indicador que falhe ali marca a
 * instância como doente e a põe em ciclo de restart. E-mail quebrado é
 * problema sério, mas o sistema continua atendendo consulta, emitindo receita e
 * gravando prontuário — derrubar tudo por causa dele seria estrago maior que o
 * defeito.
 *
 * Lê o mesmo `resolveEmailConfigStatus()` que os adapters: um health check que
 * verifica coisa diferente do que o código exige mente.
 *
 * Não usa `HealthCheckError` do terminus de propósito. Terminus sinaliza falha
 * lançando `ServiceUnavailableException`, e o ExceptionFilter global normaliza
 * tudo para Problem Details — o corpo chega como "Service Unavailable" e os
 * detalhes se perdem no caminho. Um endpoint de diagnóstico que não diz o que
 * está errado não serve para nada, então a resposta é montada aqui.
 */
@Injectable()
export class EmailHealthIndicator {
  check(): EmailHealthResponse {
    const status = resolveEmailConfigStatus()

    // Host e porta ajudam a diagnosticar; usuário e senha nunca aparecem, nem
    // mascarados — a resposta é pública e não vale o risco.
    const details: EmailHealthDetails = {
      status: status.configured ? 'up' : 'down',
      provider: status.provider,
      configured: status.configured,
      host: status.host,
      port: status.port,
      from: status.from,
      ...(status.missing.length ? { missing: status.missing } : {}),
      ...(status.partialAuth
        ? { warning: 'SMTP_USER e SMTP_PASS: um está definido e o outro não' }
        : {}),
    }

    return { status: status.configured ? 'ok' : 'error', details: { email: details } }
  }
}
