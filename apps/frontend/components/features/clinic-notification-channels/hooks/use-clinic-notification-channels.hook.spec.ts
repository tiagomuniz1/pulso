jest.mock('../use-cases/list-clinic-notification-channels.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotificationChannel } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { listClinicNotificationChannelsUseCase } from '../use-cases/list-clinic-notification-channels.use-case'
import { useClinicNotificationChannels } from './use-clinic-notification-channels.hook'

const mockUseCase = listClinicNotificationChannelsUseCase as jest.MockedFunction<
  typeof listClinicNotificationChannelsUseCase
>

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useClinicNotificationChannels', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches the enabled channels of the clinic', async () => {
    const rows = [
      { id: 'row-1', clinicId: 'clinic-1', channel: NotificationChannel.WHATSAPP, enabledAt: new Date() },
    ]
    mockUseCase.mockResolvedValue(rows)

    const { result } = renderHook(() => useClinicNotificationChannels('clinic-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(rows))
    expect(mockUseCase).toHaveBeenCalledWith('clinic-1')
  })

  // Guards the detail screen's first render, before the clinic id is resolved.
  it('does not fetch without a clinic id', () => {
    renderHook(() => useClinicNotificationChannels(''), { wrapper })
    expect(mockUseCase).not.toHaveBeenCalled()
  })
})
