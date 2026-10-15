import { deleteScheduleExceptionUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { BlockBanner } from './block-banner'

jest.mock('@app/core/src/features/schedule-exceptions/use-cases/delete-schedule-exception.use-case')

const mockDelete = deleteScheduleExceptionUseCase as jest.MockedFunction<
  typeof deleteScheduleExceptionUseCase
>

const exception = (overrides = {}) =>
  ({
    id: 'exc-1',
    professionalId: 'prof-1',
    date: '2026-04-12',
    startTime: '12:00:00',
    endTime: '13:00:00',
    reason: 'Almoço',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never

beforeEach(() => jest.clearAllMocks())

describe('BlockBanner', () => {
  it('mostra a janela bloqueada e o motivo', async () => {
    await renderWithProviders(<BlockBanner exception={exception()} canManage />)

    const banner = screen.getByTestId('block-banner-exc-1')
    expect(banner).toHaveTextContent(/12:00 – 13:00 · Bloqueado/)
    expect(banner).toHaveTextContent(/Almoço/)
  })

  // Sem horário é o dia inteiro — escrever "–" entre dois vazios não diz nada.
  it('sem horário, diz "Dia inteiro"', async () => {
    await renderWithProviders(
      <BlockBanner exception={exception({ startTime: null, endTime: null })} canManage />,
    )

    expect(screen.getByTestId('block-banner-window')).toHaveTextContent(/^Dia inteiro · Bloqueado$/)
  })

  it('sem motivo, não deixa linha vazia', async () => {
    await renderWithProviders(<BlockBanner exception={exception({ reason: null })} canManage />)

    expect(screen.queryByTestId('block-banner-reason')).toBeNull()
  })

  it('remove o bloqueio', async () => {
    mockDelete.mockResolvedValue(undefined)

    await renderWithProviders(<BlockBanner exception={exception()} canManage />)
    fireEvent.press(screen.getByTestId('block-banner-remove-exc-1'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('exc-1'))
  })

  // A recepção lê a agenda e precisa saber do bloqueio; desfazê-lo é de quem
  // administra a agenda.
  it('a recepção vê, mas não remove', async () => {
    await renderWithProviders(<BlockBanner exception={exception()} canManage={false} />)

    expect(screen.getByTestId('block-banner-exc-1')).toBeTruthy()
    expect(screen.queryByTestId('block-banner-remove-exc-1')).toBeNull()
  })

  it('apaga o botão enquanto remove', async () => {
    mockDelete.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<BlockBanner exception={exception()} canManage />)
    fireEvent.press(screen.getByTestId('block-banner-remove-exc-1'))

    await waitFor(() =>
      expect(screen.getByTestId('block-banner-remove-exc-1')).toBeDisabled(),
    )
  })
})
