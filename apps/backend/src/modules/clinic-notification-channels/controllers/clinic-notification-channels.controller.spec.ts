import { faker } from '@faker-js/faker'
import { NotificationChannel } from '@app/shared'
import { ClinicNotificationChannelsController } from './clinic-notification-channels.controller'
import { DisableClinicNotificationChannelUseCase } from '../use-cases/disable-clinic-notification-channel.use-case'
import { EnableClinicNotificationChannelUseCase } from '../use-cases/enable-clinic-notification-channel.use-case'
import { FindClinicNotificationChannelsUseCase } from '../use-cases/find-clinic-notification-channels.use-case'

const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicNotificationChannelsUseCase>
const mockEnable = { execute: jest.fn() } as unknown as jest.Mocked<EnableClinicNotificationChannelUseCase>
const mockDisable = { execute: jest.fn() } as unknown as jest.Mocked<DisableClinicNotificationChannelUseCase>

describe('ClinicNotificationChannelsController', () => {
  let controller: ClinicNotificationChannelsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ClinicNotificationChannelsController(mockFindAll, mockEnable, mockDisable)
  })

  it('findAll delegates to FindClinicNotificationChannelsUseCase', async () => {
    const clinicId = faker.string.uuid()
    const response = [
      { id: faker.string.uuid(), clinicId, channel: NotificationChannel.WHATSAPP, enabledAt: new Date() },
    ]
    mockFindAll.execute.mockResolvedValue(response)

    expect(await controller.findAll(clinicId)).toBe(response)
    expect(mockFindAll.execute).toHaveBeenCalledWith(clinicId)
  })

  it('enable delegates with the clinic and channel', async () => {
    const clinicId = faker.string.uuid()
    const response = { id: faker.string.uuid(), clinicId, channel: NotificationChannel.WHATSAPP, enabledAt: new Date() }
    mockEnable.execute.mockResolvedValue(response)

    expect(await controller.enable(clinicId, NotificationChannel.WHATSAPP)).toBe(response)
    expect(mockEnable.execute).toHaveBeenCalledWith(clinicId, NotificationChannel.WHATSAPP)
  })

  it('disable delegates with the clinic and channel', async () => {
    const clinicId = faker.string.uuid()
    mockDisable.execute.mockResolvedValue(undefined)

    await controller.disable(clinicId, NotificationChannel.WHATSAPP)
    expect(mockDisable.execute).toHaveBeenCalledWith(clinicId, NotificationChannel.WHATSAPP)
  })
})
