import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { ThemeBorderRadius } from '@app/shared'
import { getActiveThemeUseCase } from '@app/core'
import { useClinicTheme } from './use-clinic-theme.hook'

jest.mock('@app/core/src/features/themes/use-cases/get-active-theme.use-case')

const mockGetActive = getActiveThemeUseCase as jest.MockedFunction<typeof getActiveThemeUseCase>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const theme = {
  id: 't1',
  name: 'Pulso',
  slug: 'pulso',
  isDefault: true,
  accentColor: '#B5651D',
  accentSoftColor: '#FBEEE3',
  borderRadius: ThemeBorderRadius.ROUND,
  bgColor: '#FFFDF8',
  bgDarkColor: '#0B1020',
  createdAt: new Date(),
  updatedAt: new Date(),
} as never

describe('useClinicTheme', () => {
  beforeEach(() => jest.clearAllMocks())

  it('entrega os campos que o tema precisa, e só eles', async () => {
    mockGetActive.mockResolvedValue(theme)

    const { result } = await renderHook(() => useClinicTheme(true), { wrapper })

    await waitFor(() =>
      expect(result.current).toEqual({
        accentColor: '#B5651D',
        accentSoftColor: '#FBEEE3',
        bgColor: '#FFFDF8',
        bgDarkColor: '#0B1020',
        borderRadius: ThemeBorderRadius.ROUND,
      }),
    )
  })

  // O endpoint é autenticado e o `clinicId` sai do JWT: chamá-lo na tela de
  // login daria 401 a cada abertura do app, e sem clínica para representar.
  it('não busca nada antes do login', async () => {
    const { result } = await renderHook(() => useClinicTheme(false), { wrapper })

    expect(result.current).toBeUndefined()
    expect(mockGetActive).not.toHaveBeenCalled()
  })

  // Clínica sem tema configurado é caso comum, não falha: o app fica no padrão.
  it('devolve indefinido quando a clínica não tem tema', async () => {
    mockGetActive.mockResolvedValue(null as never)

    const { result } = await renderHook(() => useClinicTheme(true), { wrapper })

    await waitFor(() => expect(mockGetActive).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })
})
