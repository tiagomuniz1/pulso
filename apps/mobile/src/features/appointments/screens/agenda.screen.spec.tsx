import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import { listAppointmentsUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { AgendaScreen } from './agenda.screen'
import { addDays, formatAgendaDate, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/list-appointments.use-case')

// O prefixo `mock` é exigência do jest: o factory é içado para antes das
// declarações, e só variáveis assim nomeadas são permitidas lá dentro.
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listAppointmentsUseCase as jest.MockedFunction<typeof listAppointmentsUseCase>

const appointment = (overrides = {}) => ({
  id: 'appt-1',
  professionalId: 'doc-1',
  professionalName: 'Dra. Ana',
  patientId: 'pat-1',
  patientName: 'Maria Silva',
  specialtyId: null,
  specialtyName: 'Ginecologia',
  scheduleId: 'sch-1',
  date: todayIsoDate(),
  startTime: '09:00:00',
  endTime: '09:30:00',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  label: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const page = (data: ReturnType<typeof appointment>[]) => ({
  data,
  total: data.length,
  page: 1,
  limit: 100,
})

describe('AgendaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSessionStore.setState({
      status: 'authenticated',
      user: { id: 'u1', fullName: 'Dra. Ana', email: 'ana@pulso.test', role: 'professional', clinicId: 'c1' } as never,
    })
  })

  it('shows the spinner while the day is loading', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AgendaScreen />)

    expect(screen.getByTestId('agenda-loading')).toBeTruthy()
  })

  it('lists the appointments of the day', async () => {
    mockList.mockResolvedValue(page([appointment(), appointment({ id: 'appt-2', patientName: 'João Souza', startTime: '10:00:00' })]) as never)

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByTestId('appointment-patient-appt-1')).toHaveTextContent('Maria Silva')
    expect(screen.getByTestId('appointment-patient-appt-2')).toHaveTextContent('João Souza')
  })

  // O servidor não promete ordem; a fila do dia só serve se estiver em ordem.
  it('sorts by start time even when the server does not', async () => {
    mockList.mockResolvedValue(
      page([
        appointment({ id: 'tarde', startTime: '16:00:00' }),
        appointment({ id: 'manha', startTime: '08:00:00' }),
      ]) as never,
    )

    await renderWithProviders(<AgendaScreen />)
    await screen.findByTestId('appointment-row-manha')

    const rows = screen.getAllByTestId(/^appointment-row-/)
    expect(rows.map((row) => row.props.testID)).toEqual([
      'appointment-row-manha',
      'appointment-row-tarde',
    ])
  })

  it('says so when the day is empty', async () => {
    mockList.mockResolvedValue(page([]) as never)

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByTestId('agenda-empty')).toBeTruthy()
  })

  it('offers to try again when the agenda fails', async () => {
    mockList.mockRejectedValue(new Error('rede'))

    await renderWithProviders(<AgendaScreen />)
    expect(await screen.findByTestId('agenda-error')).toBeTruthy()

    mockList.mockResolvedValue(page([appointment()]) as never)
    fireEvent.press(screen.getByTestId('agenda-error-retry'))

    expect(await screen.findByTestId('appointment-row-appt-1')).toBeTruthy()
  })

  describe('navegação por dia', () => {
    it('opens on today', async () => {
      mockList.mockResolvedValue(page([]) as never)

      await renderWithProviders(<AgendaScreen />)

      expect(screen.getByTestId('agenda-date')).toHaveTextContent(formatAgendaDate(todayIsoDate()))
      await waitFor(() =>
        expect(mockList).toHaveBeenCalledWith({
          from: todayIsoDate(),
          to: todayIsoDate(),
          limit: 100,
        }),
      )
    })

    it.each([
      ['agenda-next-day', 1],
      ['agenda-previous-day', -1],
    ])('%s moves the day and refetches', async (testID, offset) => {
      mockList.mockResolvedValue(page([]) as never)
      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-empty')

      fireEvent.press(screen.getByTestId(testID))

      const target = addDays(todayIsoDate(), offset)
      await waitFor(() =>
        expect(screen.getByTestId('agenda-date')).toHaveTextContent(formatAgendaDate(target)),
      )
      expect(mockList).toHaveBeenCalledWith({ from: target, to: target, limit: 100 })
    })

    // O atalho só existe quando serve para alguma coisa.
    it('hides "back to today" while the day is today', async () => {
      mockList.mockResolvedValue(page([]) as never)
      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-empty')

      expect(screen.queryByTestId('agenda-today')).toBeNull()

      fireEvent.press(screen.getByTestId('agenda-next-day'))
      await waitFor(() => expect(screen.getByTestId('agenda-today')).toBeTruthy())

      fireEvent.press(screen.getByTestId('agenda-today'))
      await waitFor(() =>
        expect(screen.getByTestId('agenda-date')).toHaveTextContent(
          formatAgendaDate(todayIsoDate()),
        ),
      )
      expect(screen.queryByTestId('agenda-today')).toBeNull()
    })
  })

  it('opens the appointment when the row is pressed', async () => {
    mockList.mockResolvedValue(page([appointment()]) as never)

    await renderWithProviders(<AgendaScreen />)
    fireEvent.press(await screen.findByTestId('appointment-row-appt-1'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/appointments/appt-1')
  })

  it('shows who is logged in', async () => {
    mockList.mockResolvedValue(page([]) as never)

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByText('Dra. Ana')).toBeTruthy()
  })

  it('survives a session without a name', async () => {
    useSessionStore.setState({ status: 'authenticated', user: null })
    mockList.mockResolvedValue(page([]) as never)

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByTestId('agenda-empty')).toBeTruthy()
  })

  describe('rótulo da consulta', () => {
    it('paints the stripe with the label colour and shows its name', async () => {
      mockList.mockResolvedValue(
        page([
          appointment({
            label: { id: 'l1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD },
          }),
        ]) as never,
      )

      await renderWithProviders(<AgendaScreen />)

      expect(await screen.findByTestId('appointment-label-appt-1')).toHaveTextContent('Retorno')
      // #746A27 é o mostarda do tema claro, o mesmo da web.
      expect(screen.getByTestId('appointment-stripe-appt-1')).toHaveStyle({
        backgroundColor: '#746A27',
      })
    })

    it('leaves the stripe transparent when there is no label', async () => {
      mockList.mockResolvedValue(page([appointment()]) as never)

      await renderWithProviders(<AgendaScreen />)

      expect(await screen.findByTestId('appointment-stripe-appt-1')).toHaveStyle({
        backgroundColor: 'transparent',
      })
      expect(screen.queryByTestId('appointment-label-appt-1')).toBeNull()
    })
  })

  // Sumir sem rastro faz procurar o horário que se lembra de ter visto.
  it('keeps a cancelled appointment in the list, struck through', async () => {
    mockList.mockResolvedValue(
      page([appointment({ status: AppointmentStatus.CANCELLED })]) as never,
    )

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByTestId('appointment-status-appt-1')).toHaveTextContent('Cancelada')
    expect(screen.getByTestId('appointment-patient-appt-1')).toHaveStyle({
      textDecorationLine: 'line-through',
    })
  })

  it('falls back to the professional when the appointment has no specialty', async () => {
    mockList.mockResolvedValue(page([appointment({ specialtyName: null })]) as never)

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByText('Dra. Ana', { exact: false })).toBeTruthy()
  })
})
