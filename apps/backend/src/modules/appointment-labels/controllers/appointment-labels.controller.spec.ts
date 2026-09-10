import { AppointmentLabelColor, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateAppointmentLabelUseCase } from '../use-cases/create-appointment-label.use-case'
import { DeleteAppointmentLabelUseCase } from '../use-cases/delete-appointment-label.use-case'
import { FindAppointmentLabelsUseCase } from '../use-cases/find-appointment-labels.use-case'
import { GetAppointmentLabelUseCase } from '../use-cases/get-appointment-label.use-case'
import { UpdateAppointmentLabelUseCase } from '../use-cases/update-appointment-label.use-case'
import { AppointmentLabelsController } from './appointment-labels.controller'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateAppointmentLabelUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateAppointmentLabelUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAppointmentLabelsUseCase>
const mockGet = { execute: jest.fn() } as unknown as jest.Mocked<GetAppointmentLabelUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteAppointmentLabelUseCase>

const currentUser: ICurrentUser = {
  id: 'u1',
  role: UserRole.ADMIN,
  clinicId: '10000000-0000-4000-8000-000000000000',
}

describe('AppointmentLabelsController', () => {
  let controller: AppointmentLabelsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AppointmentLabelsController(mockCreate, mockUpdate, mockFindAll, mockGet, mockDelete)
  })

  it('create delegates to CreateAppointmentLabelUseCase', async () => {
    const dto = { name: 'Retorno', color: AppointmentLabelColor.GREEN }
    ;(mockCreate.execute as jest.Mock).mockResolvedValue({ id: 'l1' })

    const result = await controller.create(dto, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toEqual({ id: 'l1' })
  })

  it('findAll delegates with the query', async () => {
    const query = { page: 1, limit: 20, isActive: true } as any
    ;(mockFindAll.execute as jest.Mock).mockResolvedValue({ data: [] })

    await controller.findAll(query, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(query, currentUser)
  })

  it('findById delegates', async () => {
    ;(mockGet.execute as jest.Mock).mockResolvedValue({ id: 'l1' })

    await controller.findById('l1', currentUser)

    expect(mockGet.execute).toHaveBeenCalledWith('l1', currentUser)
  })

  it('update delegates', async () => {
    const dto = { name: 'Retorno rápido' }
    ;(mockUpdate.execute as jest.Mock).mockResolvedValue({ id: 'l1' })

    await controller.update('l1', dto, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('l1', dto, currentUser)
  })

  it('delete delegates', async () => {
    ;(mockDelete.execute as jest.Mock).mockResolvedValue(undefined)

    await controller.delete('l1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('l1', currentUser)
  })
})
