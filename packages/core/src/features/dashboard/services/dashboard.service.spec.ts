jest.mock('../../../api/api-client.registry')

import { apiClient } from '../../../api/api-client.registry'
import { dashboardService } from './dashboard.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('dashboardService', () => {
  beforeEach(() => jest.clearAllMocks())

  // O painel abre sem filtro antes de a pessoa escolher o período, e aí
  // `getStats()` é chamado sem argumento nenhum.
  it('calls /dashboard when called with no argument at all', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats()
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard')
  })

  it('calls /dashboard with no params when filters are empty', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({})
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard')
  })

  it('appends from, to and professionalId to the URL', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({ from: '2026-01-01', to: '2026-01-31', professionalId: 'doc-uuid' })
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/dashboard?from=2026-01-01&to=2026-01-31&professionalId=doc-uuid',
    )
  })

  it('appends only from when to is missing', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({ from: '2026-01-01' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard?from=2026-01-01')
  })
})
