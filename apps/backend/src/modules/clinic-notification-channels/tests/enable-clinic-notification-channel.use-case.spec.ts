import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'
import { EnableClinicNotificationChannelUseCase } from '../use-cases/enable-clinic-notification-channel.use-case'

const mockRepository: jest.Mocked<IClinicNotificationChannelsRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndChannel: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
}

const mockFindClinicById = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>
const mockCache = { delByPattern: jest.fn() } as unknown as jest.Mocked<CacheService>

describe('EnableClinicNotificationChannelUseCase', () => {
  let useCase: EnableClinicNotificationChannelUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new EnableClinicNotificationChannelUseCase(
      {} as DataSource,
      mockRepository,
      mockFindClinicById,
      mockCache,
    )
    mockFindClinicById.execute.mockResolvedValue({} as any)
    mockRepository.findByClinicAndChannel.mockResolvedValue(null)
    mockRepository.enable.mockResolvedValue({
      id: 'row-1',
      clinicId: 'clinic-1',
      channel: NotificationChannel.WHATSAPP,
      createdAt: new Date('2026-09-25T12:00:00Z'),
    } as any)
  })

  it('enables the channel and returns it', async () => {
    const result = await useCase.execute('clinic-1', NotificationChannel.WHATSAPP)

    expect(mockRepository.enable).toHaveBeenCalledWith('clinic-1', NotificationChannel.WHATSAPP)
    expect(result.id).toBe('row-1')
    expect(result.channel).toBe(NotificationChannel.WHATSAPP)
  })

  it('rejects enabling a channel that is already on', async () => {
    mockRepository.findByClinicAndChannel.mockResolvedValue({ id: 'row-1' } as any)

    await expect(useCase.execute('clinic-1', NotificationChannel.WHATSAPP)).rejects.toThrow(ConflictException)
    expect(mockRepository.enable).not.toHaveBeenCalled()
  })

  it('propagates the clinic 404 before touching the repository', async () => {
    mockFindClinicById.execute.mockRejectedValue(new NotFoundException('Clinic not found'))

    await expect(useCase.execute('missing', NotificationChannel.WHATSAPP)).rejects.toThrow(NotFoundException)
    expect(mockRepository.enable).not.toHaveBeenCalled()
  })

  it('invalidates the clinic channel cache', async () => {
    await useCase.execute('clinic-1', NotificationChannel.WHATSAPP)
    expect(mockCache.delByPattern).toHaveBeenCalledWith('clinic-notification-channels:clinic-1*')
  })

  // Cache is a nicety; failing to clear it must not undo an enablement that is
  // already persisted — same discipline as every other use-case in the house.
  it('still succeeds when cache invalidation fails', async () => {
    ;(mockCache.delByPattern as jest.Mock).mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute('clinic-1', NotificationChannel.WHATSAPP)).resolves.toMatchObject({ id: 'row-1' })
  })
})
