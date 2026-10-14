jest.mock('../../../api/api-client.registry')

import { apiClient } from '../../../api/api-client.registry'
import { vaccinesService } from './vaccines.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('vaccinesService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll sem parâmetro não põe query', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinesService.getAll()
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccines')
  })

  it('getAll busca por texto', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinesService.getAll({ search: 'tríplice' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccines?search=tr%C3%ADplice')
  })

  // Desativar tira a vacina das listas da clínica sem apagar as doses já
  // registradas — o backoffice ainda precisa enxergá-la para reativar.
  it('getAll pede as inativas só quando mandado', () => {
    mockApiClient.get.mockResolvedValue({} as never)

    vaccinesService.getAll({ includeInactive: true })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccines?includeInactive=true')

    vaccinesService.getAll({ includeInactive: false })
    expect(mockApiClient.get).toHaveBeenLastCalledWith('/vaccines')
  })

  it('getAll aceita paginação', () => {
    mockApiClient.get.mockResolvedValue({} as never)
    vaccinesService.getAll({ page: 2, limit: 50 })
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccines?page=2&limit=50')
  })

  it.each([
    ['getById', () => vaccinesService.getById('v1'), 'get', ['/vaccines/v1']],
    ['remove', () => vaccinesService.remove('v1'), 'delete', ['/vaccines/v1']],
  ] as const)('%s chama o endpoint certo', (_name, call, verb, args) => {
    mockApiClient[verb].mockResolvedValue(undefined as never)
    call()
    expect(mockApiClient[verb]).toHaveBeenCalledWith(...args)
  })

  it('create chama POST /vaccines', () => {
    mockApiClient.post.mockResolvedValue({} as never)
    vaccinesService.create({ name: 'BCG' } as never)
    expect(mockApiClient.post).toHaveBeenCalledWith('/vaccines', { name: 'BCG' })
  })

  it('update chama PATCH /vaccines/:id', () => {
    mockApiClient.patch.mockResolvedValue({} as never)
    vaccinesService.update('v1', { isActive: false } as never)
    expect(mockApiClient.patch).toHaveBeenCalledWith('/vaccines/v1', { isActive: false })
  })
})
