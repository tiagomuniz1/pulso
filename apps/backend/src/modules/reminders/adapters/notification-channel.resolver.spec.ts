import { NotificationChannel } from '@app/shared'
import { IWhatsAppReminderAdapter } from './whatsapp-reminder.adapter.interface'
import { NotificationChannelResolver } from './notification-channel.resolver'

const mockWhatsAppAdapter: jest.Mocked<IWhatsAppReminderAdapter> = { sendReminder: jest.fn() }

describe('NotificationChannelResolver', () => {
  let resolver: NotificationChannelResolver

  beforeEach(() => {
    jest.clearAllMocks()
    resolver = new NotificationChannelResolver(mockWhatsAppAdapter)
  })

  it('resolves WhatsApp to the WhatsApp adapter', () => {
    expect(resolver.resolve(NotificationChannel.WHATSAPP)).toBe(mockWhatsAppAdapter)
  })

  // A row can carry a channel this build cannot dispatch — an enum value that
  // shipped ahead of its adapter, or a row written straight into the DB. Throwing
  // would take down the tick for every other clinic on one bad row.
  it('returns null for a channel with no adapter, without throwing', () => {
    expect(resolver.resolve('email' as NotificationChannel)).toBeNull()
  })
})
