jest.mock('../use-cases/disable-clinic-notification-channel.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotificationChannel } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { disableClinicNotificationChannelUseCase } from '../use-cases/disable-clinic-notification-channel.use-case'
import { useDisableClinicNotificationChannel } from './use-disable-clinic-notification-channel.hook'

const mockUseCase = disableClinicNotificationChannelUseCase as jest.MockedFunction<
  typeof disableClinicNotificationChannelUseCase
>

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useDisableClinicNotificationChannel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('disables the channel for the clinic', async () => {
    mockUseCase.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDisableClinicNotificationChannel('clinic-1'), { wrapper })

    act(() => result.current.mutate(NotificationChannel.WHATSAPP))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUseCase).toHaveBeenCalledWith('clinic-1', NotificationChannel.WHATSAPP)
  })

  it('surfaces the failure to the caller', async () => {
    mockUseCase.mockRejectedValue({ status: 404, detail: 'não habilitado' })

    const { result } = renderHook(() => useDisableClinicNotificationChannel('clinic-1'), { wrapper })

    act(() => result.current.mutate(NotificationChannel.WHATSAPP))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
