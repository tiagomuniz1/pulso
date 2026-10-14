import { AppointmentLabelColor, AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import {
  getAvailabilityUseCase,
  listAppointmentLabelsUseCase,
  listAppointmentsUseCase,
  listProfessionalsUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { useThemeStore } from '../../../theme/theme.store'
import { AgendaScreen } from './agenda.screen'
import { addDays, formatToolbarDate, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/list-appointments.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/get-availability.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/list-appointment-labels.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockAppointments = listAppointmentsUseCase as jest.MockedFunction<typeof listAppointmentsUseCase>
const mockAvailability = getAvailabilityUseCase as jest.MockedFunction<typeof getAvailabilityUseCase>
const mockProfessionals = listProfessionalsUseCase as jest.MockedFunction<typeof listProfessionalsUseCase>
const mockLabels = listAppointmentLabelsUseCase as jest.MockedFunction<typeof listAppointmentLabelsUseCase>

const TODAY = todayIsoDate()

const freeSlot = (startTime: string) =>
  ({ startTime, endTime: '08:30', scheduleId: 'sch', slotDurationInMinutes: 30 }) as never

const appointment = (overrides = {}) =>
  ({
    id: 'appt-1',
    professionalId: 'prof-1',
    professionalName: 'Dra. Ana',
    patientId: 'pat-1',
    patientName: 'Maria Silva',
    specialtyId: null,
    specialtyName: 'Ginecologia',
    scheduleId: 'sch',
    date: TODAY,
    startTime: '09:00',
    endTime: '09:30',
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
  }) as never

const page = (data: unknown[]) => ({ data, total: data.length, page: 1, limit: 100 }) as never

const professional = (id: string, fullName: string) =>
  ({
    id,
    user: { id: `u-${id}`, fullName, email: `${id}@pulso.test`, isActive: true },
    registrations: [
      { id: 'r', councilType: CouncilType.CRM, number: '1', state: 'PE', isPrimary: true },
    ],
    specialties: [],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never

const label = (id: string, name: string) =>
  ({
    id,
    name,
    color: AppointmentLabelColor.MUSTARD,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as never

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dra. Ana', email: 'ana@pulso.test', role, clinicId: 'c1' } as never,
  })
}

describe('AgendaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    asRole(UserRole.ADMIN)
    mockProfessionals.mockResolvedValue([professional('prof-1', 'Dra. Ana')])
    mockLabels.mockResolvedValue(page([]))
    mockAvailability.mockResolvedValue([])
    mockAppointments.mockResolvedValue(page([]))
  })

  it('shows the spinner while the day is loading', async () => {
    mockAvailability.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AgendaScreen />)

    expect(screen.getByTestId('agenda-loading')).toBeTruthy()
  })

  describe('a grade', () => {
    it('shows one row per free slot', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00'), freeSlot('08:30')] as never)

      await renderWithProviders(<AgendaScreen />)

      await waitFor(() => expect(screen.getAllByTestId('agenda-slot-free')).toHaveLength(2))
    })

    it('shows the appointment in its slot', async () => {
      mockAppointments.mockResolvedValue(page([appointment()]))

      await renderWithProviders(<AgendaScreen />)

      expect(await screen.findByTestId('agenda-slot-booked-appt-1')).toHaveTextContent(
        '09:00Maria SilvaAgendada',
      )
    })

    /**
     * A regra que a mesclagem existe para impedir.
     *
     * A disponibilidade só retém o horário enquanto a consulta está agendada,
     * então uma concluída volta como horário livre **e** como consulta. Duas
     * linhas no mesmo minuto se leem como agendamento duplo.
     */
    it('does not show the same minute twice', async () => {
      mockAvailability.mockResolvedValue([freeSlot('09:00')] as never)
      mockAppointments.mockResolvedValue(
        page([appointment({ status: AppointmentStatus.COMPLETED })]),
      )

      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-slot-booked-appt-1')

      expect(screen.queryAllByTestId('agenda-slot-free')).toHaveLength(0)
    })

    it('says so when the day has no slots', async () => {
      await renderWithProviders(<AgendaScreen />)

      expect(await screen.findByTestId('agenda-day-empty')).toBeTruthy()
    })

    it('opens the appointment when its row is pressed', async () => {
      mockAppointments.mockResolvedValue(page([appointment()]))

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('agenda-slot-booked-appt-1'))

      expect(mockPush).toHaveBeenCalledWith('/(app)/appointments/appt-1')
    })

    it('a free slot leads nowhere — booking is a later phase', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

      await renderWithProviders(<AgendaScreen />)
      await waitFor(() => expect(screen.getByTestId('agenda-slot-free')).toBeTruthy())

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('offers to try again when the agenda fails', async () => {
      mockAvailability.mockRejectedValue(new Error('rede'))

      await renderWithProviders(<AgendaScreen />)
      expect(await screen.findByTestId('agenda-error')).toBeTruthy()

      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)
      fireEvent.press(screen.getByTestId('agenda-error-retry'))

      await waitFor(() => expect(screen.getByTestId('agenda-slot-free')).toBeTruthy())
    })
  })

  describe('a barra', () => {
    it('opens on today and asks the server for it', async () => {
      await renderWithProviders(<AgendaScreen />)

      expect(screen.getByTestId('toolbar-date-label')).toHaveTextContent(formatToolbarDate(TODAY))
      await waitFor(() =>
        expect(mockAvailability).toHaveBeenCalledWith({ professionalId: 'prof-1', date: TODAY }),
      )
    })

    it.each([
      ['toolbar-next', 1],
      ['toolbar-prev', -1],
    ])('%s moves the day and refetches', async (testID, offset) => {
      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-day-empty')

      fireEvent.press(screen.getByTestId(testID))

      const target = addDays(TODAY, offset)
      await waitFor(() =>
        expect(screen.getByTestId('toolbar-date-label')).toHaveTextContent(
          formatToolbarDate(target),
        ),
      )
      expect(mockAvailability).toHaveBeenCalledWith({ professionalId: 'prof-1', date: target })
    })

    it('"Hoje" brings the day back', async () => {
      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-day-empty')

      fireEvent.press(screen.getByTestId('toolbar-next'))
      await waitFor(() =>
        expect(screen.getByTestId('toolbar-date-label')).toHaveTextContent(
          formatToolbarDate(addDays(TODAY, 1)),
        ),
      )

      fireEvent.press(screen.getByTestId('toolbar-today'))
      await waitFor(() =>
        expect(screen.getByTestId('toolbar-date-label')).toHaveTextContent(formatToolbarDate(TODAY)),
      )
    })

    // Um profissional só não é escolha — é ruído ocupando a barra.
    it('hides the professional chips when there is only one', async () => {
      await renderWithProviders(<AgendaScreen />)
      await screen.findByTestId('agenda-day-empty')

      expect(screen.queryByTestId('toolbar-professional-selector')).toBeNull()
    })

    it('switches the agenda to the chosen professional', async () => {
      mockProfessionals.mockResolvedValue([
        professional('prof-1', 'Dra. Ana'),
        professional('prof-2', 'Dr. Yago'),
      ])

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('toolbar-professional-prof-2'))

      await waitFor(() =>
        expect(mockAvailability).toHaveBeenCalledWith({ professionalId: 'prof-2', date: TODAY }),
      )
    })
  })

  describe('o rótulo', () => {
    beforeEach(() => {
      mockLabels.mockResolvedValue(page([label('l1', 'Retorno')]))
    })

    it('paints the stripe with the label colour', async () => {
      mockAppointments.mockResolvedValue(
        page([
          appointment({
            label: { id: 'l1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD },
          }),
        ]),
      )

      await renderWithProviders(<AgendaScreen />)

      // #746A27 é o mostarda do tema claro, o mesmo da web.
      expect(await screen.findByTestId('agenda-slot-label-appt-1')).toHaveStyle({
        backgroundColor: '#746A27',
      })
    })

    it('filters the grid by the chosen label', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)
      mockAppointments.mockResolvedValue(page([appointment()]))

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('agenda-label-l1'))

      // Sob filtro a mensagem padrão mentiria: há horários, só nenhum com o
      // rótulo escolhido.
      expect(await screen.findByTestId('agenda-day-empty-filtered')).toBeTruthy()
    })

    it('tapping the chosen label again clears the filter', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('agenda-label-l1'))
      await screen.findByTestId('agenda-day-empty-filtered')

      fireEvent.press(screen.getByTestId('agenda-label-l1'))

      await waitFor(() => expect(screen.getByTestId('agenda-slot-free')).toBeTruthy())
    })
  })

  // O servidor já recorta por ele; mandar o id seria o cliente adivinhar o
  // próprio `professionalId` antes de conseguir desenhar qualquer coisa.
  it('o PROFESSIONAL vê a própria agenda, sem pedir o id', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<AgendaScreen />)

    await waitFor(() =>
      expect(mockAvailability).toHaveBeenCalledWith({ professionalId: undefined, date: TODAY }),
    )
  })

  // A clínica sem nenhum profissional cadastrado não tem agenda que mostrar —
  // e dizer isso é melhor do que uma grade vazia, que se lê como erro.
  it('pede um profissional quando não há nenhum', async () => {
    mockProfessionals.mockResolvedValue([])

    await renderWithProviders(<AgendaScreen />)

    expect(await screen.findByTestId('agenda-empty-professional')).toBeTruthy()
  })

  // A recepção lê a agenda, mas não agenda: o horário livre fica apagado.
  it('a recepção vê a grade com os horários livres apagados', async () => {
    asRole(UserRole.USER)
    mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

    await renderWithProviders(<AgendaScreen />)

    await waitFor(() =>
      expect(screen.getByTestId('agenda-slot-free')).toHaveStyle({ opacity: 0.4 }),
    )
  })

  it('o tema escuro muda a cor dos rótulos na legenda', async () => {
    useThemeStore.setState({ mode: 'dark' })
    mockLabels.mockResolvedValue(page([label('l1', 'Retorno')]))

    await renderWithProviders(<AgendaScreen />)
    const chip = await screen.findByTestId('agenda-label-l1')

    // #CBC076 é o mostarda do tema escuro.
    expect(chip).toHaveStyle({ borderColor: '#CBC076' })

    useThemeStore.setState({ mode: 'light' })
  })
})
