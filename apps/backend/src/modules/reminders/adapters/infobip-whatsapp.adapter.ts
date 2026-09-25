import { Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'
import CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import {
  ISendWhatsAppReminderParams,
  ISendWhatsAppReminderResult,
  IWhatsAppReminderAdapter,
} from './whatsapp-reminder.adapter.interface'

/** Meta language code of the approved template, when not overridden via env. */
const DEFAULT_TEMPLATE_LANGUAGE = 'pt_BR'

const REQUEST_TIMEOUT_MS = 10000

/** Shape of Infobip's WhatsApp template send response (single message). */
interface InfobipSendResponse {
  messageId?: string
  messages?: { messageId?: string }[]
}

/** Infobip reports the reason for a 4xx here; without it errors read "status code 400". */
interface InfobipErrorBody {
  requestError?: { serviceException?: { text?: string; messageId?: string } }
}

/**
 * Sends appointment reminders as WhatsApp template messages via Infobip.
 *
 * Business-initiated WhatsApp messages must use a template pre-approved by Meta,
 * so we send a template name + ordered placeholders, never free text.
 *
 * Plain axios rather than `@infobip-api/sdk`: the payload is a handful of JSON
 * fields, the house already ships axios and opossum, and a CommonJS SDK imported
 * as a default is exactly what broke PDF logos in production once.
 *
 * Resilience is timeout + circuit breaker, and deliberately **no retry** — this
 * is a send. A timeout that actually delivered would, on retry, message the
 * patient twice; the unique (appointmentId, offsetLabel) guards against a
 * duplicate tick, not against a retry inside one. Errors propagate so the
 * caller records the failure per message.
 *
 * Skips gracefully (no throw) until the Infobip/Meta onboarding is configured,
 * which lets the feature ship dormant.
 */
@Injectable()
export class InfobipWhatsAppAdapter implements IWhatsAppReminderAdapter {
  private readonly logger = new Logger(InfobipWhatsAppAdapter.name)
  private readonly client: AxiosInstance = axios.create({ timeout: REQUEST_TIMEOUT_MS })
  private readonly breaker: CircuitBreaker<[ISendWhatsAppReminderParams], ISendWhatsAppReminderResult>

  constructor() {
    this.breaker = new CircuitBreaker((params: ISendWhatsAppReminderParams) => this.send(params), {
      timeout: REQUEST_TIMEOUT_MS,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })
  }

  async sendReminder(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult> {
    return this.breaker.fire(params)
  }

  private async send(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult> {
    const env = getEnvConfig()

    if (
      !env.INFOBIP_BASE_URL ||
      !env.INFOBIP_API_KEY ||
      !env.INFOBIP_WHATSAPP_FROM ||
      !env.INFOBIP_REMINDER_TEMPLATE_NAME
    ) {
      this.logger.warn('Infobip WhatsApp not fully configured — skipping reminder send', {
        context: InfobipWhatsAppAdapter.name,
      })
      return { status: 'skipped', providerMessageId: null }
    }

    const payload = {
      messages: [
        {
          from: this.toInfobipNumber(env.INFOBIP_WHATSAPP_FROM),
          to: this.toInfobipNumber(params.toE164),
          content: {
            templateName: env.INFOBIP_REMINDER_TEMPLATE_NAME,
            templateData: { body: { placeholders: params.variables } },
            language: env.INFOBIP_REMINDER_TEMPLATE_LANGUAGE ?? DEFAULT_TEMPLATE_LANGUAGE,
          },
        },
      ],
    }

    try {
      const response = await this.client.post<InfobipSendResponse>(
        `${this.normalizeBaseUrl(env.INFOBIP_BASE_URL)}/whatsapp/1/message/template`,
        payload,
        { headers: { Authorization: `App ${env.INFOBIP_API_KEY}` } },
      )

      // Single sends answer with a top-level messageId; batch sends nest it under
      // `messages`. Read both so a shape change doesn't silently blank the column.
      const providerMessageId =
        response.data?.messageId ?? response.data?.messages?.[0]?.messageId ?? null

      return { status: 'sent', providerMessageId }
    } catch (error) {
      throw this.withProviderReason(error)
    }
  }

  /**
   * Infobip's examples carry the number without the leading "+", and the
   * "whatsapp:" prefix is a Twilio-ism that has no meaning here.
   */
  private toInfobipNumber(value: string): string {
    return value.replace(/^whatsapp:/, '').replace(/^\+/, '')
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const withScheme = /^https?:\/\//.test(baseUrl) ? baseUrl : `https://${baseUrl}`
    return withScheme.replace(/\/+$/, '')
  }

  /**
   * Surfaces Infobip's own explanation so the reminder row stores "Template not
   * found" instead of "Request failed with status code 400".
   */
  private withProviderReason(error: unknown): unknown {
    if (!axios.isAxiosError(error)) return error

    const reason = (error.response?.data as InfobipErrorBody | undefined)?.requestError
      ?.serviceException?.text

    if (!reason) return error

    error.message = `${error.message}: ${reason}`
    return error
  }
}
