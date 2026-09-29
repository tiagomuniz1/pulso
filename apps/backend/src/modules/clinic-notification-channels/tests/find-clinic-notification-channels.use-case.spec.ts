import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { NotificationChannel } from '@app/shared'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IClinicNotificationChannelsRepository } from '../repositories/clinic-notification-channels.repository.interface'
import { FindClinicNotificationChannelsUseCase } from '../use-cases/find-clinic-notification-channels.use-case'

const mockRepository: jest.Mocked<IClinicNotificationChannelsRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndChannel: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
}

const mockFindClinicById = { execute: jest.fn() } as unknown as jest.Mocked<FindClinicByIdUseCase>

describe('FindClinicNotificationChannelsUseCase', () => {
  let useCase: FindClinicNotificationChannelsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindClinicNotificationChannelsUseCase({} as DataSource, mockRepository, mockFindClinicById)
    mockFindClinicById.execute.mockResolvedValue({} as any)
  })

  it('maps the enabled channels to the response contract', async () => {
    const enabledAt = new Date('2026-09-25T12:00:00Z')
    mockRepository.findByClinicId.mockResolvedValue([
      { id: 'row-1', clinicId: 'clinic-1', channel: NotificationChannel.WHATSAPP, createdAt: enabledAt } as any,
    ])

    expect(await useCase.execute('clinic-1')).toEqual([
      { id: 'row-1', clinicId: 'clinic-1', channel: NotificationChannel.WHATSAPP, enabledAt },
    ])
  })

  it('returns an empty list for a clinic that opted into nothing', async () => {
    mockRepository.findByClinicId.mockResolvedValue([])
    expect(await useCase.execute('clinic-1')).toEqual([])
  })

  // A typo in the clinic id must not read as "this clinic has no channels".
  it('propagates the clinic 404', async () => {
    mockFindClinicById.execute.mockRejectedValue(new NotFoundException('Clinic not found'))

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException)
    expect(mockRepository.findByClinicId).not.toHaveBeenCalled()
  })
})
