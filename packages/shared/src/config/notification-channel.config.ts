import { NotificationChannel } from '../enums/notification-channel.enum'

// SINGLE SOURCE OF TRUTH for how each notification channel is presented. The
// backoffice renders the toggle list from here, so a channel added to the enum
// with an entry here shows up in the UI without touching a component.
export interface NotificationChannelConfig {
  label: string
  // Shown under the label in the backoffice, so whoever flips the toggle knows
  // what the clinic's patients will actually receive.
  description: string
}

export const NOTIFICATION_CHANNELS: Record<NotificationChannel, NotificationChannelConfig> = {
  [NotificationChannel.WHATSAPP]: {
    label: 'WhatsApp',
    description: 'Lembretes de consulta enviados por mensagem no WhatsApp.',
  },
}

// Stable render order for the backoffice list — Object.keys order on a Record is
// an implementation detail, and the list should not reshuffle when the enum does.
export const NOTIFICATION_CHANNEL_ORDER: NotificationChannel[] = [NotificationChannel.WHATSAPP]
