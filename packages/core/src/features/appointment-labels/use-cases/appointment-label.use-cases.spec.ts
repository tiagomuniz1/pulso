jest.mock('../services/appointment-labels.service')

import { AppointmentLabelColor } from '@app/shared'
import { appointmentLabelsService } from '../services/appointment-labels.service'
import { createAppointmentLabelUseCase } from './create-appointment-label.use-case'
import { deleteAppointmentLabelUseCase } from './delete-appointment-label.use-case'
import { listAppointmentLabelsUseCase } from './list-appointment-labels.use-case'
import { updateAppointmentLabelUseCase } from './update-appointment-label.use-case'

const mockService = appointmentLabelsService as jest.Mocked<typeof appointmentLabelsService>

const dto = {
  id: 'label-uuid',
  name: 'Retorno',
  color: AppointmentLabelColor.GREEN,
  isActive: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
} as never

describe('use-cases de rótulo de consulta', () => {
  beforeEach(() => jest.clearAllMocks())

  it('listAppointmentLabels devolve a página mapeada', async () => {
    mockService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 } as never)

    const result = await listAppointmentLabelsUseCase({ isActive: true })

    expect(mockService.getAll).toHaveBeenCalledWith({ isActive: true })
    expect(result.total).toBe(1)
    expect(result.data[0]?.createdAt).toBeInstanceOf(Date)
  })

  // O service recebe só nome e cor: o `isActive` de um rótulo novo é decisão
  // do servidor, e mandá-lo daqui seria o cliente opinando sobre o padrão.
  it('createAppointmentLabel manda apenas nome e cor', async () => {
    mockService.create.mockResolvedValue(dto)

    const result = await createAppointmentLabelUseCase({
      name: 'Retorno',
      color: AppointmentLabelColor.GREEN,
    })

    expect(mockService.create).toHaveBeenCalledWith({
      name: 'Retorno',
      color: AppointmentLabelColor.GREEN,
    })
    expect(result.id).toBe('label-uuid')
  })

  it('updateAppointmentLabel repassa o que mudou', async () => {
    mockService.update.mockResolvedValue(dto)

    const result = await updateAppointmentLabelUseCase('label-uuid', { isActive: false })

    expect(mockService.update).toHaveBeenCalledWith('label-uuid', { isActive: false })
    expect(result.name).toBe('Retorno')
  })

  it('deleteAppointmentLabel não devolve nada', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await expect(deleteAppointmentLabelUseCase('label-uuid')).resolves.toBeUndefined()
    expect(mockService.remove).toHaveBeenCalledWith('label-uuid')
  })
})
