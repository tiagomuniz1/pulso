jest.mock('@/stores/auth.store')
jest.mock('../services/appointment-labels.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentLabelColor, UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { appointmentLabelsService } from '../services/appointment-labels.service'
import { AppointmentLabelList } from './appointment-label-list'

const mockService = appointmentLabelsService as jest.Mocked<typeof appointmentLabelsService>

function mockAuthAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector: (s: any) => unknown) =>
    selector({ user: { id: 'u1', role, clinicId: 'c1' } }),
  )
}

const makeDto = (overrides = {}) => ({
  id: 'label-1',
  name: 'Retorno',
  color: AppointmentLabelColor.GREEN,
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

const paginated = (items = [makeDto()]) => ({ data: items, total: items.length, page: 1, limit: 50 })

describe('AppointmentLabelList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthAs(UserRole.ADMIN)
    mockService.getAll.mockResolvedValue(paginated() as any)
  })

  it('shows a skeleton while loading', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}) as any)
    renderWithProviders(<AppointmentLabelList />)

    expect(screen.getByTestId('appointment-label-list-skeleton')).toBeInTheDocument()
  })

  it('shows the error state when the listing fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('network'))
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() =>
      expect(screen.getByTestId('appointment-label-list-error')).toBeInTheDocument(),
    )
  })

  it('shows the empty state', async () => {
    mockService.getAll.mockResolvedValue(paginated([]) as any)
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() =>
      expect(screen.getByTestId('appointment-label-list-empty')).toBeInTheDocument(),
    )
  })

  it('lists each label as a coloured pill', async () => {
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-list-table')).toBeInTheDocument())
    expect(screen.getByTestId('appointment-label-pill-label-1')).toHaveTextContent('Retorno')
    expect(screen.getByTestId('appointment-label-color-name-label-1')).toHaveTextContent('Verde')
    expect(screen.getByTestId('appointment-label-status-label-1')).toHaveTextContent('Ativo')
  })

  it('creates a label through the modal', async () => {
    mockService.create.mockResolvedValue(makeDto() as any)
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-label-list-new-button'))

    await userEvent.type(screen.getByTestId('appointment-label-form-name'), 'Pré-natal')
    await userEvent.click(screen.getByTestId(`appointment-label-color-${AppointmentLabelColor.ROSE}`))
    await userEvent.click(screen.getByTestId('appointment-label-form-submit'))

    await waitFor(() =>
      expect(mockService.create).toHaveBeenCalledWith({
        name: 'Pré-natal',
        color: AppointmentLabelColor.ROSE,
      }),
    )
  })

  it('blocks the submit until a colour is chosen', async () => {
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-label-list-new-button'))
    await userEvent.type(screen.getByTestId('appointment-label-form-name'), 'Sem cor')
    await userEvent.click(screen.getByTestId('appointment-label-form-submit'))

    expect(await screen.findByTestId('appointment-label-form-color-error')).toBeInTheDocument()
    expect(mockService.create).not.toHaveBeenCalled()
  })

  // O nome é o que distingue dois rótulos no seletor e na legenda — repetir
  // deixaria a escolha impossível, e a mensagem tem de dizer que renomear resolve.
  it('explains a duplicate name instead of a generic error', async () => {
    mockService.create.mockRejectedValue({ status: 409 })
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-label-list-new-button'))
    await userEvent.type(screen.getByTestId('appointment-label-form-name'), 'Retorno')
    await userEvent.click(screen.getByTestId(`appointment-label-color-${AppointmentLabelColor.GREEN}`))
    await userEvent.click(screen.getByTestId('appointment-label-form-submit'))

    expect(await screen.findByTestId('appointment-label-form-error')).toHaveTextContent(
      'Já existe um rótulo com esse nome',
    )
  })

  // Desativar é "pare de usar em coisas novas"; excluir é "tire da clínica".
  it('deactivates without deleting', async () => {
    mockService.update.mockResolvedValue(makeDto({ isActive: false }) as any)
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-toggle-label-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-label-toggle-label-1'))

    await waitFor(() =>
      expect(mockService.update).toHaveBeenCalledWith('label-1', { isActive: false }),
    )
  })

  it('deletes after confirming, and warns what happens to the appointments', async () => {
    mockService.remove.mockResolvedValue(undefined as any)
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-delete-label-1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-label-delete-label-1'))

    expect(screen.getByTestId('appointment-label-delete-dialog')).toHaveTextContent(
      'ficam sem rótulo na agenda',
    )
    await userEvent.click(screen.getByTestId('appointment-label-delete-dialog-confirm'))

    await waitFor(() => expect(mockService.remove).toHaveBeenCalledWith('label-1'))
  })

  it('does not offer management to a professional', async () => {
    mockAuthAs(UserRole.PROFESSIONAL)
    renderWithProviders(<AppointmentLabelList />)

    await waitFor(() => expect(screen.getByTestId('appointment-label-list-table')).toBeInTheDocument())
    expect(screen.queryByTestId('appointment-label-list-new-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('appointment-label-edit-label-1')).not.toBeInTheDocument()
  })
})
