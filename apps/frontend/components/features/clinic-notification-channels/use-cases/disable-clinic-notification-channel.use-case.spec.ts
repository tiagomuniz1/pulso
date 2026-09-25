jest.mock('../services/clinic-notification-channels.service')

import { NotificationChannel } from '@app/shared'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { disableClinicNotificationChannelUseCase } from './disable-clinic-notification-channel.use-case'

const mockService = clinicNotificationChannelsService as jest.Mocked<typeof clinicNotificationChannelsService>

describe('disableClinicNotificationChannelUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('delegates to the service', async () => {
    mockService.disable.mockResolvedValue(undefined)

    await disableClinicNotificationChannelUseCase('clinic-uuid-1', NotificationChannel.WHATSAPP)
    expect(mockService.disable).toHaveBeenCalledWith('clinic-uuid-1', NotificationChannel.WHATSAPP)
  })
})
