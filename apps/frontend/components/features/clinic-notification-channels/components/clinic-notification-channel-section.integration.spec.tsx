jest.mock('../services/clinic-notification-channels.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationChannel } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { clinicNotificationChannelsService } from '../services/clinic-notification-channels.service'
import { ClinicNotificationChannelSection } from './clinic-notification-channel-section'

const mockService = clinicNotificationChannelsService as jest.Mocked<
  typeof clinicNotificationChannelsService
>

const CLINIC_ID = 'clinic-uuid-1'

const makeDto = () => ({
  id: 'row-uuid-1',
  clinicId: CLINIC_ID,
  channel: NotificationChannel.WHATSAPP,
  enabledAt: new Date('2026-09-25T10:00:00.000Z'),
})

describe('ClinicNotificationChannelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockService.getAll.mockResolvedValue([])
    mockService.enable.mockResolvedValue(makeDto())
    mockService.disable.mockResolvedValue(undefined)
  })

  it('renders the loading state first', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    expect(screen.getByTestId('clinic-notification-channel-loading')).toBeInTheDocument()
  })

  it('renders the error state when the list fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('network'))
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() =>
      expect(screen.getByTestId('clinic-notification-channel-list-error')).toBeInTheDocument(),
    )
  })

  // The list comes from the enum, not from the API response: a channel nobody
  // enabled yet still has to be on screen, or it could never be turned on.
  it('lists every known channel even when none is enabled', async () => {
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() => expect(screen.getByTestId('clinic-notification-channel-list')).toBeInTheDocument())
    expect(screen.getByTestId('clinic-notification-channel-item-whatsapp')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-notification-channel-toggle-whatsapp')).not.toBeChecked()
    expect(screen.getByText('Inativo')).toBeInTheDocument()
  })

  it('shows a channel the clinic already enabled as active', async () => {
    mockService.getAll.mockResolvedValue([makeDto()])
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() =>
      expect(screen.getByTestId('clinic-notification-channel-toggle-whatsapp')).toBeChecked(),
    )
    expect(screen.getByText('Ativo')).toBeInTheDocument()
  })

  it('enables the channel when the toggle is turned on', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() => expect(screen.getByTestId('clinic-notification-channel-list')).toBeInTheDocument())
    await user.click(screen.getByTestId('clinic-notification-channel-toggle-whatsapp'))

    await waitFor(() =>
      expect(mockService.enable).toHaveBeenCalledWith(CLINIC_ID, NotificationChannel.WHATSAPP),
    )
    expect(await screen.findByTestId('clinic-notification-channel-success')).toHaveTextContent(
      'WhatsApp habilitado',
    )
  })

  it('disables the channel when the toggle is turned off', async () => {
    mockService.getAll.mockResolvedValue([makeDto()])
    const user = userEvent.setup()
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() =>
      expect(screen.getByTestId('clinic-notification-channel-toggle-whatsapp')).toBeChecked(),
    )
    await user.click(screen.getByTestId('clinic-notification-channel-toggle-whatsapp'))

    await waitFor(() =>
      expect(mockService.disable).toHaveBeenCalledWith(CLINIC_ID, NotificationChannel.WHATSAPP),
    )
    expect(await screen.findByTestId('clinic-notification-channel-success')).toHaveTextContent(
      'WhatsApp desabilitado',
    )
  })

  it('surfaces a failure to enable without flipping the toggle', async () => {
    mockService.enable.mockRejectedValue({ status: 409 })
    const user = userEvent.setup()
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() => expect(screen.getByTestId('clinic-notification-channel-list')).toBeInTheDocument())
    await user.click(screen.getByTestId('clinic-notification-channel-toggle-whatsapp'))

    expect(await screen.findByTestId('clinic-notification-channel-error')).toHaveTextContent(
      'Não foi possível habilitar WhatsApp',
    )
    expect(screen.getByTestId('clinic-notification-channel-toggle-whatsapp')).not.toBeChecked()
  })

  it('surfaces a failure to disable', async () => {
    mockService.getAll.mockResolvedValue([makeDto()])
    mockService.disable.mockRejectedValue({ status: 404 })
    const user = userEvent.setup()
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    await waitFor(() =>
      expect(screen.getByTestId('clinic-notification-channel-toggle-whatsapp')).toBeChecked(),
    )
    await user.click(screen.getByTestId('clinic-notification-channel-toggle-whatsapp'))

    expect(await screen.findByTestId('clinic-notification-channel-error')).toHaveTextContent(
      'Não foi possível desabilitar WhatsApp',
    )
  })

  // Whoever flips this switch has to know it is the platform's opt-in, not a
  // clinic preference that merely mutes something.
  it('spells out what no enabled channel means', async () => {
    renderWithProviders(<ClinicNotificationChannelSection clinicId={CLINIC_ID} />)

    expect(
      await screen.findByText(/não envia notificação alguma às pacientes/i),
    ).toBeInTheDocument()
  })
})
