jest.mock('../../../api/api-client.registry')

import { apiClient } from '../../../api/api-client.registry'
import { vaccinationsService } from './vaccinations.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('vaccinationsService', () => {
  beforeEach(() => jest.clearAllMocks())

  // A caderneta é ancorada no paciente, não na consulta — a dose aplicada
  // anos atrás noutro serviço não tem consulta a que se amarrar.
  it('getAll recorta por paciente', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinationsService.getAll({ patientId: 'pat-1' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccinations?patientId=pat-1')
  })

  it('getAll recorta por consulta', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinationsService.getAll({ appointmentId: 'appt-1' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccinations?appointmentId=appt-1')
  })

  it('getAll aceita paginação', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinationsService.getAll({ patientId: 'pat-1', page: 2, limit: 10 })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccinations?patientId=pat-1&page=2&limit=10')
  })

  it('getAll sem recorte nenhum não inventa parâmetro', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinationsService.getAll({})
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccinations?')
  })

  it('create chama POST /vaccinations', () => {
    mockApiClient.post.mockResolvedValue({} as never)
    vaccinationsService.create({ vaccineId: 'v1' } as never)
    expect(mockApiClient.post).toHaveBeenCalledWith('/vaccinations', { vaccineId: 'v1' })
  })

  it('update chama PATCH /vaccinations/:id', () => {
    mockApiClient.patch.mockResolvedValue({} as never)
    vaccinationsService.update('vac-1', { dose: '2ª' } as never)
    expect(mockApiClient.patch).toHaveBeenCalledWith('/vaccinations/vac-1', { dose: '2ª' })
  })

  it('remove chama DELETE /vaccinations/:id', () => {
    mockApiClient.delete.mockResolvedValue(undefined as never)
    vaccinationsService.remove('vac-1')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/vaccinations/vac-1')
  })
})
