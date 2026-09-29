import { Injectable, Logger } from '@nestjs/common'
import { NotificationChannel } from '@app/shared'
import { IWhatsAppReminderAdapter } from './whatsapp-reminder.adapter.interface'

/**
 * Maps an enabled channel to the adapter that delivers it.
 *
 * With one channel this is a switch of one case, and that is the point: it is
 * the single place a second channel plugs into, so neither the use-case nor the
 * repository learns about email or SMS.
 *
 * Returns null instead of throwing for an unknown channel. A row can carry a
 * channel this build cannot dispatch — an enum value shipped ahead of its
 * adapter, or a row written straight into the DB — and one bad row must not
 * take down the tick for every other clinic.
 */
@Injectable()
export class NotificationChannelResolver {
  private readonly logger = new Logger(NotificationChannelResolver.name)

  constructor(private readonly whatsAppAdapter: IWhatsAppReminderAdapter) {}

  resolve(channel: NotificationChannel): IWhatsAppReminderAdapter | null {
    switch (channel) {
      case NotificationChannel.WHATSAPP:
        return this.whatsAppAdapter
      default:
        this.logger.warn('No adapter registered for notification channel', {
          context: NotificationChannelResolver.name,
          channel,
        })
        return null
    }
  }
}
