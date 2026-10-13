import { createMedicalRecordUseCase, updateMedicalRecordUseCase } from '@app/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { useSaveMedicalRecord } from './use-medical-record.hook'

jest.mock('@app/core/src/features/medical-records/use-cases/create-medical-record.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/update-medical-record.use-case')

const mockCreate = createMedicalRecordUseCase as jest.MockedFunction<typeof createMedicalRecordUseCase>
const mockUpdate = updateMedicalRecordUseCase as jest.MockedFunction<typeof updateMedicalRecordUseCase>

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// `renderHook`, como `render`, é assíncrono no RNTL 14.
/**
 * `notes` ausente e `notes` vazio são coisas diferentes para o backend: o
 * primeiro não toca no campo, o segundo o apaga. Mandar `undefined` quando
 * não há observação sobrescreveria o que já estava escrito lá.
 */
describe('useSaveMedicalRecord e o campo de observações', () => {
  beforeEach(() => jest.clearAllMocks())

  it('leaves notes out of the creation when there is none', async () => {
    mockCreate.mockResolvedValue({ id: 'rec-1' } as never)
    const { result } = await renderHook(() => useSaveMedicalRecord('appt-1'), { wrapper })

    await act(async () => {
      result.current.mutate({
        recordId: null,
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: { a: 1 },
        notes: null,
      })
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: { a: 1 },
      }),
    )
  })

  it('leaves notes out of the update when there is none', async () => {
    mockUpdate.mockResolvedValue({ id: 'rec-1' } as never)
    const { result } = await renderHook(() => useSaveMedicalRecord('appt-1'), { wrapper })

    await act(async () => {
      result.current.mutate({
        recordId: 'rec-1',
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: { a: 1 },
        notes: null,
      })
    })

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('rec-1', { data: { a: 1 } }))
  })

  it('sends notes when there are any', async () => {
    mockUpdate.mockResolvedValue({ id: 'rec-1' } as never)
    const { result } = await renderHook(() => useSaveMedicalRecord('appt-1'), { wrapper })

    await act(async () => {
      result.current.mutate({
        recordId: 'rec-1',
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: {},
        notes: 'Retorno em 30 dias',
      })
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('rec-1', {
        data: {},
        notes: 'Retorno em 30 dias',
      }),
    )
  })

  it('sends notes on creation too', async () => {
    mockCreate.mockResolvedValue({ id: 'rec-1' } as never)
    const { result } = await renderHook(() => useSaveMedicalRecord('appt-1'), { wrapper })

    await act(async () => {
      result.current.mutate({
        recordId: null,
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: {},
        notes: 'Primeira consulta',
      })
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        templateId: 'tpl-1',
        data: {},
        notes: 'Primeira consulta',
      }),
    )
  })
})
