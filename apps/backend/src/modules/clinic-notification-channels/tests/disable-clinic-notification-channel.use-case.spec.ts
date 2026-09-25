import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'
import { DisableClinicNotificationChannelUseCase } from '../use-cases/disable-clinic-notification-channel.use-case'

const mockRepository: jest.Mocked<IClinicNotificationChannelsRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndChannel: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
}

const mockFindClinicById = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockCache = { delByPattern: jest.fn() } as unknown as jest.Mocked<CacheService>

describe('DisableClinicNotificationChannelUseCase', () => {
  let useCase: DisableClinicNotificationChannelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DisableClinicNotificationChannelUseCase(
      {} as DataSource,
      mockRepository,
      mockFindClinicById,
      mockCache,
    )
    mockFindClinicById.execute.mockResolvedValue({} as any)
    mockRepository.findByClinicAndChannel.mockResolvedValue({ id: 'row-1' } as any)
    ;(mockCache.delByPattern as jest.Mock).mockResolvedValue(undefined)
  })

  it('disables the channel by removing the row', async () => {
    await useCase.execute('clinic-1', NotificationChannel.WHATSAPP)
    expect(mockRepository.disable).toHaveBeenCalledWith('row-1')
  })

  // 404 rather than a silent 204: disabling something never enabled usually
  // means the caller is acting on a stale screen.
  it('404s when the channel was not enabled', async () => {
    mockRepository.findByClinicAndChannel.mockResolvedValue(null)

    await expect(useCase.execute('clinic-1', NotificationChannel.WHATSAPP)).rejects.toThrow(NotFoundException)
    expect(mockRepository.disable).not.toHaveBeenCalled()
  })

  it('propagates the clinic 404', async () => {
    mockFindClinicById.execute.mockRejectedValue(new NotFoundException('Clinic not found'))
    await expect(useCase.execute('missing', NotificationChannel.WHATSAPP)).rejects.toThrow(NotFoundException)
  })

  it('invalidates the clinic channel cache', async () => {
    await useCase.execute('clinic-1', NotificationChannel.WHATSAPP)
    expect(mockCache.delByPattern).toHaveBeenCalledWith('clinic-notification-channels:clinic-1*')
  })

  it('still succeeds when cache invalidation fails', async () => {
    ;(mockCache.delByPattern as jest.Mock).mockRejectedValue(new Error('redis down'))
    await expect(useCase.execute('clinic-1', NotificationChannel.WHATSAPP)).resolves.toBeUndefined()
  })
})
