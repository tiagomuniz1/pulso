jest.mock('../use-cases/download-medical-record-pdf.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { downloadMedicalRecordPdfUseCase } from '../use-cases/download-medical-record-pdf.use-case'
import { useDownloadMedicalRecordPdf } from './use-download-medical-record-pdf.hook'

const mockUseCase = downloadMedicalRecordPdfUseCase as jest.MockedFunction<
  typeof downloadMedicalRecordPdfUseCase
>

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useDownloadMedicalRecordPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls the use-case with id and file name', async () => {
    mockUseCase.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDownloadMedicalRecordPdf(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'record-uuid', fileName: 'prontuario-ana.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUseCase).toHaveBeenCalledWith('record-uuid', 'prontuario-ana.pdf')
  })

  it('passes undefined when no file name is given', async () => {
    mockUseCase.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDownloadMedicalRecordPdf(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'record-uuid' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUseCase).toHaveBeenCalledWith('record-uuid', undefined)
  })

  // É este `isError` que a tela lê para mostrar o Alert — os outros cinco
  // downloads da casa falham em silêncio.
  it('exposes the failure so the screen can say something', async () => {
    mockUseCase.mockRejectedValue({ status: 403 })
    const { result } = renderHook(() => useDownloadMedicalRecordPdf(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'record-uuid' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
