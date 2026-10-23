import { AppointmentStatus, RecurrenceInterval, DayOfWeek } from '@app/shared'
import { getAppointmentSeriesUseCase } from '@app/core'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { SeriesSheet } from './series-sheet'

jest.mock('@app/core/src/features/appointments/use-cases/get-appointment-series.use-case')

const mockSeries = getAppointmentSeriesUseCase as jest.MockedFunction<typeof getAppointmentSeriesUseCase>

const occurrence = (id: string, date: string, status = AppointmentStatus.SCHEDULED) =>
  ({ id, date, startTime: '09:00:00', status }) as never

const series = (overrides = {}) =>
  ({
    id: 'ser-1',
    professionalName: 'Dra. Ana',
    patientName: 'Maria Silva',
    specialtyName: 'Ginecologia',
    recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '09:00:00',
    // 2026-04-13 é uma segunda-feira.
    anchorDate: '2026-04-13',
    createdOccurrenceCount: 2,
    occurrences: [occurrence('appt-1', '2026-04-13'), occurrence('appt-2', '2026-04-20')],
    ...overrides,
  }) as never

const onClose = jest.fn()
const onSelect = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockSeries.mockResolvedValue(series())
})

function render() {
  return renderWithProviders(
    <SeriesSheet
      seriesId="ser-1"
      currentAppointmentId="appt-1"
      isOpen
      onClose={onClose}
      onSelect={onSelect}
    />,
  )
}

describe('SeriesSheet', () => {
  it('resume a série em uma frase', async () => {
    await render()

    expect(await screen.findByTestId('series-summary')).toHaveTextContent(
      /Toda segunda-feira às 09:00/,
    )
    expect(screen.getByTestId('series-summary')).toHaveTextContent(/A cada 1 semana · 2 consultas/)
  })

  it('lista cada sessão com data e situação', async () => {
    await render()

    const item = await screen.findByTestId('series-item-2026-04-20')
    expect(item).toHaveTextContent(/Sessão 2/)
    expect(item).toHaveTextContent(/20\/04\/2026/)
    expect(screen.getByTestId('series-status-2026-04-20')).toHaveTextContent('Agendada')
  })

  // Numa série de vinte, saber onde se está é metade do que a lista serve
  // para responder.
  it('marca a sessão aberta', async () => {
    await render()

    const current = await screen.findByTestId('series-item-2026-04-13')
    expect(current.props.accessibilityState.selected).toBe(true)
    expect(
      screen.getByTestId('series-item-2026-04-20').props.accessibilityState.selected,
    ).toBe(false)
  })

  it('leva à sessão escolhida', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('series-item-2026-04-20'))

    expect(onSelect).toHaveBeenCalledWith('appt-2')
  })

  it('oferece tentar de novo quando falha', async () => {
    mockSeries.mockRejectedValue(new Error('rede'))

    await render()
    await screen.findByTestId('series-error')

    mockSeries.mockResolvedValue(series())
    fireEvent.press(screen.getByTestId('series-error-retry'))

    expect(await screen.findByTestId('series-summary')).toBeTruthy()
  })

  it('mostra o giro enquanto carrega', async () => {
    mockSeries.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('series-loading')).toBeTruthy()
  })

  // Fechada, a folha não pede a série: o cabeçalho de toda consulta
  // recorrente a montaria sem ninguém ter tocado em "Ver série".
  it('fechada, não pede nada ao servidor', async () => {
    await renderWithProviders(
      <SeriesSheet
        seriesId="ser-1"
        currentAppointmentId="appt-1"
        isOpen={false}
        onClose={onClose}
        onSelect={onSelect}
      />,
    )

    expect(mockSeries).not.toHaveBeenCalled()
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('series-sheet-close'))

    expect(onClose).toHaveBeenCalled()
  })
})
