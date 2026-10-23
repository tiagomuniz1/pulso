import type { ReactNode } from 'react'
import { CouncilType } from '@app/shared'
import { getMyProfessionalUseCase } from '@app/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useCanIssue } from './use-can-issue.hook'

jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')

const mockMine = getMyProfessionalUseCase as jest.MockedFunction<typeof getMyProfessionalUseCase>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const ficha = (id: string) =>
  ({
    id,
    user: { id: 'u1', fullName: 'Dra. Ana', email: 'a@p.test', isActive: true },
    registrations: [
      { id: 'r', councilType: CouncilType.CRM, number: '1', state: 'PE', isPrimary: true },
    ],
    specialties: [],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never

describe('useCanIssue', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deixa emitir na própria consulta', async () => {
    mockMine.mockResolvedValue(ficha('prof-1'))

    const { result } = await renderHook(() => useCanIssue('prof-1'), { wrapper })

    await waitFor(() => expect(result.current).toBe(true))
  })

  /**
   * Todo documento sai com nome, conselho e registro de quem assina. Emitir
   * sobre consulta alheia poria o registro de uma pessoa num documento que
   * ela não redigiu — e a receita ainda leva um QR que a farmácia confere.
   */
  it('não deixa emitir na consulta de outro profissional', async () => {
    mockMine.mockResolvedValue(ficha('prof-1'))

    const { result } = await renderHook(() => useCanIssue('prof-2'), { wrapper })

    await waitFor(() => expect(mockMine).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  // O ADMIN que administra sem atender: cargo não é exercício.
  it('não deixa emitir quem não tem ficha', async () => {
    mockMine.mockResolvedValue(null)

    const { result } = await renderHook(() => useCanIssue('prof-1'), { wrapper })

    await waitFor(() => expect(mockMine).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  it('não deixa emitir enquanto a consulta não carregou', async () => {
    mockMine.mockResolvedValue(ficha('prof-1'))

    const { result } = await renderHook(() => useCanIssue(undefined), { wrapper })

    await waitFor(() => expect(mockMine).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })
})
