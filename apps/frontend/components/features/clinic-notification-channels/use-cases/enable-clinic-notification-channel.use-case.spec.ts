jest.mock('../services/clinic-notification-channels.service')

import { NotificationChannel } from '@app/shared'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { enableClinicNotificationChannelUseCase } from './enable-clinic-notification-channel.use-case'

const mockService = clinicNotificationChannelsService as jest.Mocked<typeof clinicNotificationChannelsService>

describe('enableClinicNotificationChannelUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('enables and maps the response to a model', async () => {
    mockService.enable.mockResolvedValue({
      id: 'row-1',
      clinicId: 'clinic-uuid-1',
      channel: NotificationChannel.WHATSAPP,
      enabledAt: '2026-09-25T10:00:00.000Z' as unknown as Date,
    })

    const result = await enableClinicNotificationChannelUseCase('clinic-uuid-1', NotificationChannel.WHATSAPP)

    expect(result.channel).toBe(NotificationChannel.WHATSAPP)
    expect(result.enabledAt).toBeInstanceOf(Date)
    expect(mockService.enable).toHaveBeenCalledWith('clinic-uuid-1', NotificationChannel.WHATSAPP)
  })
})
