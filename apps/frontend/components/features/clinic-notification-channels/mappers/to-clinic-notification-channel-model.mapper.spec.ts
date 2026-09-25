import { NotificationChannel } from '@app/shared'
import { toClinicNotificationChannelModel } from './to-clinic-notification-channel-model.mapper'

describe('toClinicNotificationChannelModel', () => {
  it('maps every field and turns the ISO string into a Date', () => {
    const dto = {
      id: 'row-uuid-1',
      clinicId: 'clinic-uuid-1',
      channel: NotificationChannel.WHATSAPP,
      enabledAt: '2026-09-25T10:00:00.000Z' as unknown as Date,
    }

    const model = toClinicNotificationChannelModel(dto)

    expect(model.id).toBe(dto.id)
    expect(model.clinicId).toBe(dto.clinicId)
    expect(model.channel).toBe(NotificationChannel.WHATSAPP)
    expect(model.enabledAt).toBeInstanceOf(Date)
    expect(model.enabledAt.toISOString()).toBe('2026-09-25T10:00:00.000Z')
  })
})
