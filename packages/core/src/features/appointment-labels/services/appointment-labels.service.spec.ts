jest.mock('../../../api/api-client.registry')

import { AppointmentLabelColor } from '@app/shared'
import { apiClient } from '../../../api/api-client.registry'
import { appointmentLabelsService } from './appointment-labels.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('appointmentLabelsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /appointment-labels without query when no params', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    appointmentLabelsService.getAll()
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointment-labels')
  })

  it('getAll appends pagination', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    appointmentLabelsService.getAll({ page: 2, limit: 10 })
    expect(mockApiClient.get).toHaveBeenCalledWith('/appointment-labels?page=2&limit=10')
  })

  // `false` precisa viajar: é como o ADMIN lista os rótulos aposentados, e um
  // `if (params.isActive)` comum trataria isso como "não filtrar".
  it.each([
    [true, 'isActive=true'],
    [false, 'isActive=false'],
  ])('getAll sends isActive=%s', (isActive, expected) => {
    mockApiClient.get.mockResolvedValue({} as never)
    appointmentLabelsService.getAll({ isActive })
    expect(mockApiClient.get).toHaveBeenCalledWith(`/appointment-labels?${expected}`)
  })

  it('create calls POST /appointment-labels', () => {
    mockApiClient.post.mockResolvedValue({} as never)
    appointmentLabelsService.create({ name: 'Retorno', color: AppointmentLabelColor.GREEN })
    expect(mockApiClient.post).toHaveBeenCalledWith('/appointment-labels', {
      name: 'Retorno',
      color: AppointmentLabelColor.GREEN,
    })
  })

  it('update calls PATCH /appointment-labels/:id', () => {
    mockApiClient.patch.mockResolvedValue({} as never)
    appointmentLabelsService.update('label-uuid', { name: 'Encaixe' })
    expect(mockApiClient.patch).toHaveBeenCalledWith('/appointment-labels/label-uuid', {
      name: 'Encaixe',
    })
  })

  it('remove calls DELETE /appointment-labels/:id', () => {
    mockApiClient.delete.mockResolvedValue(undefined as never)
    appointmentLabelsService.remove('label-uuid')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/appointment-labels/label-uuid')
  })
})
