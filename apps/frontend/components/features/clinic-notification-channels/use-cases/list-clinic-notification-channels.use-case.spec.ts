jest.mock('../services/clinic-notification-channels.service')

import { NotificationChannel } from '@app/shared'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { listClinicNotificationChannelsUseCase } from './list-clinic-notification-channels.use-case'

const mockService = clinicNotificationChannelsService as jest.Mocked<typeof clinicNotificationChannelsService>

describe('listClinicNotificationChannelsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps every DTO to a model', async () => {
    mockService.getAll.mockResolvedValue([
      {
        id: 'row-1',
        clinicId: 'clinic-uuid-1',
        channel: NotificationChannel.WHATSAPP,
        enabledAt: '2026-09-25T10:00:00.000Z' as unknown as Date,
      },
    ])

    const result = await listClinicNotificationChannelsUseCase('clinic-uuid-1')

    expect(result).toHaveLength(1)
    expect(result[0].enabledAt).toBeInstanceOf(Date)
    expect(mockService.getAll).toHaveBeenCalledWith('clinic-uuid-1')
  })

  it('returns an empty list when the clinic opted into nothing', async () => {
    mockService.getAll.mockResolvedValue([])
    expect(await listClinicNotificationChannelsUseCase('clinic-uuid-1')).toEqual([])
  })
})
