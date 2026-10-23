import { AppointmentLabelColor, AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import {
  getAvailabilityUseCase,
  getMyProfessionalUseCase,
  listAppointmentLabelsUseCase,
  listAppointmentsUseCase,
  listPatientsUseCase,
  listProfessionalsUseCase,
  listScheduleExceptionsUseCase,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { useThemeStore } from '../../../theme/theme.store'
import { AgendaScreen } from './agenda.screen'
import { addDays, formatToolbarDate, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/list-appointments.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/get-availability.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/list-appointment-labels.use-case')
jest.mock('@app/core/src/features/schedule-exceptions/use-cases/list-schedule-exceptions.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')
jest.mock('@app/core/src/features/patients/use-cases/list-patients.use-case')

const mockPush = jest.fn()
/**
 * Sobrescrito nos casos que chegam à agenda pela lista de profissionais.
 *
 * O prefixo `mock` não é estilo: o jest só permite que a fábrica de
 * `jest.mock` leia variáveis externas com esse prefixo.
 */
let mockRouteParams: Record<string, string> = {}
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockRouteParams,
}))

const mockAppointments = listAppointmentsUseCase as jest.MockedFunction<typeof listAppointmentsUseCase>
const mockAvailability = getAvailabilityUseCase as jest.MockedFunction<typeof getAvailabilityUseCase>
const mockProfessionals = listProfessionalsUseCase as jest.MockedFunction<typeof listProfessionalsUseCase>
const mockLabels = listAppointmentLabelsUseCase as jest.MockedFunction<typeof listAppointmentLabelsUseCase>
const mockExceptions = listScheduleExceptionsUseCase as jest.MockedFunction<
  typeof listScheduleExceptionsUseCase
>

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
    mockRouteParams = {}
    asRole(UserRole.ADMIN)
    mockProfessionals.mockResolvedValue([professional('prof-1', 'Dra. Ana')])
    mockLabels.mockResolvedValue(page([]))
    mockExceptions.mockResolvedValue([])
    // Sem ficha: é o ADMIN que administra sem atender. Quem precisa da
    // própria agenda como padrão a concede explicitamente.
    ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue(null)
    ;(listPatientsUseCase as jest.Mock).mockResolvedValue([])
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

      await waitFor(() => expect(screen.getAllByTestId(/^agenda-slot-free-/)).toHaveLength(2))
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

      expect(screen.queryAllByTestId(/^agenda-slot-free-/)).toHaveLength(0)
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

    // O horário livre agenda; não navega. Confundir os dois tiraria a pessoa
    // da agenda para uma tela que ainda não existe.
    it('o horário livre abre o agendamento, e não navega', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

      await renderWithProviders(<AgendaScreen />)
      // Amanhã: às 08:00 de hoje a linha pode já estar no passado, e aí ela
      // não responde ao toque de propósito.
      fireEvent.press(await screen.findByTestId('toolbar-next'))
      fireEvent.press(await screen.findByTestId('agenda-slot-free-08:00'))

      expect(await screen.findByTestId('book-appointment-sheet')).toBeTruthy()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('offers to try again when the agenda fails', async () => {
      mockAvailability.mockRejectedValue(new Error('rede'))

      await renderWithProviders(<AgendaScreen />)
      expect(await screen.findByTestId('agenda-error')).toBeTruthy()

      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)
      fireEvent.press(screen.getByTestId('agenda-error-retry'))

      await waitFor(() => expect(screen.getByTestId('agenda-slot-free-08:00')).toBeTruthy())
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

    // Select, não pastilhas: a clínica tem dezenas de profissionais, e numa
    // faixa rolável quem está fora da tela desaparece.
    it('switches the agenda to the chosen professional', async () => {
      mockProfessionals.mockResolvedValue([
        professional('prof-1', 'Dra. Ana'),
        professional('prof-2', 'Dr. Yago'),
      ])

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('toolbar-professional-select'))
      fireEvent.press(await screen.findByTestId('toolbar-professional-select-option-prof-2'))

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

    // As pastilhas coloridas são legenda; quem filtra é o select.
    it('mostra a legenda de cores sem transformá-la em filtro', async () => {
      await renderWithProviders(<AgendaScreen />)

      const pill = await screen.findByTestId('agenda-label-legend-item-l1')
      expect(pill).toHaveTextContent('Retorno')
      expect(screen.queryByTestId('agenda-label-l1')).toBeNull()
    })

    it('filters the grid by the chosen label', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)
      mockAppointments.mockResolvedValue(page([appointment()]))

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('toolbar-label-select'))
      fireEvent.press(await screen.findByTestId('toolbar-label-select-option-l1'))

      // Sob filtro a mensagem padrão mentiria: há horários, só nenhum com o
      // rótulo escolhido.
      expect(await screen.findByTestId('agenda-day-empty-filtered')).toBeTruthy()
    })

    it('"Todos os rótulos" limpa o filtro', async () => {
      mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

      await renderWithProviders(<AgendaScreen />)
      fireEvent.press(await screen.findByTestId('toolbar-label-select'))
      fireEvent.press(await screen.findByTestId('toolbar-label-select-option-l1'))
      await screen.findByTestId('agenda-day-empty-filtered')

      fireEvent.press(screen.getByTestId('toolbar-label-select'))
      fireEvent.press(await screen.findByTestId('toolbar-label-select-option-all'))

      await waitFor(() => expect(screen.getByTestId('agenda-slot-free-08:00')).toBeTruthy())
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
      expect(screen.getByTestId('agenda-slot-free-08:00')).toHaveStyle({ opacity: 0.4 }),
    )
  })

  it('o tema escuro muda a cor dos rótulos na legenda', async () => {
    useThemeStore.setState({ mode: 'dark' })
    mockLabels.mockResolvedValue(page([label('l1', 'Retorno')]))

    await renderWithProviders(<AgendaScreen />)
    const pill = await screen.findByTestId('agenda-label-legend-item-l1')

    // #2D2807 é o fundo suave do mostarda no tema escuro.
    expect(pill).toHaveStyle({ backgroundColor: '#2D2807' })

    useThemeStore.setState({ mode: 'light' })
  })

  it('abre e fecha a folha de bloquear horário', async () => {
    await renderWithProviders(<AgendaScreen />)

    fireEvent.press(await screen.findByTestId('toolbar-block-time'))
    expect(await screen.findByTestId('block-time-sheet')).toBeTruthy()

    fireEvent.press(screen.getByTestId('block-time-sheet-close'))

    await waitFor(() => expect(screen.queryByTestId('block-time-sheet')).toBeNull())
  })

  it('fecha a folha de agendamento sem agendar', async () => {
    mockAvailability.mockResolvedValue([freeSlot('08:00')] as never)

    await renderWithProviders(<AgendaScreen />)
    fireEvent.press(await screen.findByTestId('toolbar-next'))
    fireEvent.press(await screen.findByTestId('agenda-slot-free-08:00'))
    await screen.findByTestId('book-appointment-sheet')

    fireEvent.press(screen.getByTestId('book-appointment-sheet-close'))

    await waitFor(() => expect(screen.queryByTestId('book-appointment-sheet')).toBeNull())
  })

  // O ADMIN que também atende cai na própria agenda; sem ficha, no primeiro
  // da lista. Qualquer escolha dele tem precedência.
  it('o ADMIN com ficha abre na própria agenda', async () => {
    ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue({ id: 'prof-2' })
    mockProfessionals.mockResolvedValue([
      professional('prof-1', 'Dra. Ana'),
      professional('prof-2', 'Dr. Bruno'),
    ])

    await renderWithProviders(<AgendaScreen />)

    await waitFor(() =>
      expect(mockAvailability).toHaveBeenCalledWith({ professionalId: 'prof-2', date: TODAY }),
    )
  })

  /**
   * O "Consultas" da lista de profissionais abre a agenda **daquela**
   * pessoa, como o `?doctor=` da web. Sem isto o toque cairia na agenda de
   * outra pessoa e não teria sentido nenhum.
   */
  it('abre na agenda de quem veio pela rota', async () => {
    mockRouteParams = { professionalId: 'prof-2' }
    mockProfessionals.mockResolvedValue([
      professional('prof-1', 'Dra. Ana'),
      professional('prof-2', 'Dr. Bruno'),
    ])

    await renderWithProviders(<AgendaScreen />)

    await waitFor(() =>
      expect(mockAvailability).toHaveBeenCalledWith({ professionalId: 'prof-2', date: TODAY }),
    )
  })

  /**
   * A rota é ponto de partida, não prisão: trocar no seletor depois tem de
   * funcionar, senão quem chegou pelo link fica preso naquela agenda.
   */
  it('a escolha no seletor vence a rota', async () => {
    mockRouteParams = { professionalId: 'prof-2' }
    mockProfessionals.mockResolvedValue([
      professional('prof-1', 'Dra. Ana'),
      professional('prof-2', 'Dr. Bruno'),
    ])

    await renderWithProviders(<AgendaScreen />)
    await waitFor(() => expect(mockAvailability).toHaveBeenCalled())

    await act(async () => {
      fireEvent.press(screen.getByTestId('toolbar-professional-select'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('toolbar-professional-select-option-prof-1'))
    })

    await waitFor(() =>
      expect(mockAvailability).toHaveBeenLastCalledWith({ professionalId: 'prof-1', date: TODAY }),
    )
  })

  /**
   * Sem a faixa, um dia de férias se parece com um dia sem agenda
   * cadastrada — os horários simplesmente não vêm, e nada diz por quê.
   */
  it('mostra os bloqueios do dia no topo da grade', async () => {
    mockExceptions.mockResolvedValue([
      {
        id: 'exc-1',
        professionalId: 'prof-1',
        date: todayIsoDate(),
        startTime: '12:00',
        endTime: '13:00',
        reason: 'Almoço',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never)

    await renderWithProviders(<AgendaScreen />)

    const banner = await screen.findByTestId('block-banner-exc-1')
    expect(banner).toHaveTextContent(/12:00 – 13:00 · Bloqueado/)
    expect(banner).toHaveTextContent(/Almoço/)
  })

  it('a recepção vê o bloqueio, mas não o remove', async () => {
    asRole(UserRole.USER)
    mockExceptions.mockResolvedValue([
      {
        id: 'exc-1',
        professionalId: 'prof-1',
        date: todayIsoDate(),
        startTime: null,
        endTime: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never)

    await renderWithProviders(<AgendaScreen />)
    const banner = await screen.findByTestId('block-banner-exc-1')

    expect(banner).toHaveTextContent(/Dia inteiro · Bloqueado/)
    expect(screen.queryByTestId('block-banner-remove-exc-1')).toBeNull()
  })
})
