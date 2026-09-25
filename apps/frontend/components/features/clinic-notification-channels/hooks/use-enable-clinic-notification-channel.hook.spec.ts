jest.mock('../use-cases/enable-clinic-notification-channel.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotificationChannel } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { enableClinicNotificationChannelUseCase } from '../use-cases/enable-clinic-notification-channel.use-case'
import { useEnableClinicNotificationChannel } from './use-enable-clinic-notification-channel.hook'

const mockUseCase = enableClinicNotificationChannelUseCase as jest.MockedFunction<
  typeof enableClinicNotificationChannelUseCase
>

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useEnableClinicNotificationChannel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('enables the channel for the clinic', async () => {
    const model = {
      id: 'row-1',
      clinicId: 'clinic-1',
      channel: NotificationChannel.WHATSAPP,
      enabledAt: new Date(),
    }
    mockUseCase.mockResolvedValue(model)

    const { result } = renderHook(() => useEnableClinicNotificationChannel('clinic-1'), { wrapper })

    act(() => result.current.mutate(NotificationChannel.WHATSAPP))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUseCase).toHaveBeenCalledWith('clinic-1', NotificationChannel.WHATSAPP)
  })

  it('surfaces the failure to the caller', async () => {
    mockUseCase.mockRejectedValue({ status: 409, detail: 'já habilitado' })

    const { result } = renderHook(() => useEnableClinicNotificationChannel('clinic-1'), { wrapper })

    act(() => result.current.mutate(NotificationChannel.WHATSAPP))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
