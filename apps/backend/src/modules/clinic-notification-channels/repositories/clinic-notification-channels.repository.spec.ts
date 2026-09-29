import { NotificationChannel } from '@app/shared'
import { Repository } from 'typeorm'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'
import { ClinicNotificationChannelsRepository } from './clinic-notification-channels.repository'

const mockRepository = {
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
} as unknown as jest.Mocked<Repository<ClinicNotificationChannel>>

describe('ClinicNotificationChannelsRepository', () => {
  let repository: ClinicNotificationChannelsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new ClinicNotificationChannelsRepository(mockRepository)
  })

  it('lists a clinic channels oldest first', async () => {
    const rows = [{ id: 'row-1' }] as ClinicNotificationChannel[]
    ;(mockRepository.find as jest.Mock).mockResolvedValue(rows)

    expect(await repository.findByClinicId('clinic-1')).toBe(rows)
    expect(mockRepository.find).toHaveBeenCalledWith({
      where: { clinicId: 'clinic-1' },
      order: { createdAt: 'ASC' },
    })
  })

  it('finds one by clinic and channel', async () => {
    ;(mockRepository.findOneBy as jest.Mock).mockResolvedValue(null)

    expect(await repository.findByClinicAndChannel('clinic-1', NotificationChannel.WHATSAPP)).toBeNull()
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      channel: NotificationChannel.WHATSAPP,
    })
  })

  it('enables by persisting the row', async () => {
    const created = { clinicId: 'clinic-1', channel: NotificationChannel.WHATSAPP }
    ;(mockRepository.create as jest.Mock).mockReturnValue(created)
    ;(mockRepository.save as jest.Mock).mockResolvedValue({ id: 'row-1', ...created })

    const result = await repository.enable('clinic-1', NotificationChannel.WHATSAPP)

    expect(mockRepository.create).toHaveBeenCalledWith(created)
    expect(mockRepository.save).toHaveBeenCalledWith(created)
    expect(result.id).toBe('row-1')
  })

  // Hard delete on purpose: the absence of the row is what "disabled" means.
  it('disables by deleting the row', async () => {
    await repository.disable('row-1')
    expect(mockRepository.delete).toHaveBeenCalledWith('row-1')
  })

  it('uses the query runner repository when inside a transaction', async () => {
    const txRepository = { create: jest.fn().mockReturnValue({}), save: jest.fn().mockResolvedValue({ id: 'row-2' }), delete: jest.fn() }
    const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(txRepository) } } as any

    await repository.enable('clinic-1', NotificationChannel.WHATSAPP, queryRunner)
    await repository.disable('row-2', queryRunner)

    expect(txRepository.save).toHaveBeenCalled()
    expect(txRepository.delete).toHaveBeenCalledWith('row-2')
    expect(mockRepository.save).not.toHaveBeenCalled()
    expect(mockRepository.delete).not.toHaveBeenCalled()
  })
})
