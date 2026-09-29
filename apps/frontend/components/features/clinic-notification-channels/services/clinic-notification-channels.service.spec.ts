jest.mock('@/lib/api-client')

import { NotificationChannel } from '@app/shared'
import { apiClient } from '@/lib/api-client'
import { clinicNotificationChannelsService } from './clinic-notification-channels.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>
const CLINIC_ID = 'clinic-uuid-1'

describe('clinicNotificationChannelsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET on the clinic channels path', async () => {
    mockApiClient.get.mockResolvedValue([])

    expect(await clinicNotificationChannelsService.getAll(CLINIC_ID)).toEqual([])
    expect(mockApiClient.get).toHaveBeenCalledWith(`/clinics/${CLINIC_ID}/notification-channels`)
  })

  it('enable calls POST with the channel in the path', async () => {
    const dto = { id: 'row-1', clinicId: CLINIC_ID, channel: NotificationChannel.WHATSAPP, enabledAt: new Date() }
    mockApiClient.post.mockResolvedValue(dto)

    expect(await clinicNotificationChannelsService.enable(CLINIC_ID, NotificationChannel.WHATSAPP)).toBe(dto)
    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/notification-channels/whatsapp`,
    )
  })

  it('disable calls DELETE with the channel in the path', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await clinicNotificationChannelsService.disable(CLINIC_ID, NotificationChannel.WHATSAPP)
    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/notification-channels/whatsapp`,
    )
  })
})
