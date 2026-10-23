import { AppointmentStatus, UserRole } from '@app/shared'
import {
  getPatientUseCase,
  listAppointmentsUseCase,
  listProfessionalsUseCase,
  type IPatientModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { PatientAppointmentsScreen } from './patient-appointments.screen'

jest.mock('@app/core/src/features/patients/use-cases/get-patient.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/list-appointments.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'pat-1' }),
}))

const mockPatient = getPatientUseCase as jest.MockedFunction<typeof getPatientUseCase>
const mockList = listAppointmentsUseCase as jest.MockedFunction<typeof listAppointmentsUseCase>
const mockProfessionals = listProfessionalsUseCase as jest.MockedFunction<
  typeof listProfessionalsUseCase
>

const appointment = (overrides = {}) =>
  ({
    id: 'appt-1',
    date: '2026-10-20',
    startTime: '09:00',
    professionalName: 'Dr. Mauro Lima',
    status: AppointmentStatus.COMPLETED,
    ...overrides,
  }) as never

const page = (data: unknown[], total = data.length) =>
  ({ data, total, page: 1, limit: 10 }) as never

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockPatient.mockResolvedValue({ id: 'pat-1', fullName: 'Ana Paula Souza' } as IPatientModel)
  mockList.mockResolvedValue(page([appointment()]))
  mockProfessionals.mockResolvedValue([
    { id: 'prof-1', user: { fullName: 'Dr. Mauro Lima' } },
  ] as never)
})

describe('PatientAppointmentsScreen', () => {
  it('mostra o nome do paciente no título', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)

    // `findByTestId` resolve na hora: o título existe desde o primeiro
    // desenho, como "Consultas", e só ganha o nome quando o paciente chega.
    // Esperar o elemento passaria antes da resposta — e passava, às vezes.
    await waitFor(() =>
      expect(screen.getByTestId('patient-appointments-title')).toHaveTextContent(
        /Consultas de Ana Paula Souza/,
      ),
    )
  })

  it('lista a consulta com data, profissional e situação', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)

    const card = await screen.findByTestId('patient-appointment-appt-1')
    expect(card).toHaveTextContent(/20\/10\/2026 · 09:00/)
    expect(card).toHaveTextContent(/Dr\. Mauro Lima/)
    expect(card).toHaveTextContent(/Concluída/)
  })

  it('abre a consulta', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)

    fireEvent.press(await screen.findByTestId('patient-appointment-open-appt-1'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/appointments/appt-1')
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)

    fireEvent.press(await screen.findByTestId('patient-appointments-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<PatientAppointmentsScreen />)

    expect(screen.getByTestId('patient-appointments-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientAppointmentsScreen />)
    fireEvent.press(await screen.findByTestId('patient-appointments-error-retry'))

    expect(await screen.findByTestId('patient-appointment-appt-1')).toBeTruthy()
  })

  it('diz quando o paciente não tem consulta', async () => {
    mockList.mockResolvedValue(page([]))

    await renderWithProviders(<PatientAppointmentsScreen />)

    expect(await screen.findByTestId('patient-appointments-empty')).toHaveTextContent(
      /Nenhuma consulta registrada/,
    )
  })

  it('filtra por profissional e volta para a primeira página', async () => {
    mockList.mockResolvedValue(page([appointment()], 25))

    await renderWithProviders(<PatientAppointmentsScreen />)
    await screen.findByTestId('patient-appointment-appt-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-next'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-professional'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('patient-appointments-professional-option-prof-1'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        patientId: 'pat-1',
        professionalId: 'prof-1',
        page: 1,
        limit: 10,
      }),
    )
  })

  it('com filtro e sem resultado, diz que foi o filtro', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)
    await screen.findByTestId('patient-appointment-appt-1')

    mockList.mockResolvedValue(page([]))
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-professional'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('patient-appointments-professional-option-prof-1'))
    })

    await waitFor(() =>
      expect(screen.getByTestId('patient-appointments-empty')).toHaveTextContent(
        /Nenhuma consulta com este profissional/,
      ),
    )
  })

  it('pagina quando há mais de uma página', async () => {
    mockList.mockResolvedValue(page([appointment()], 25))

    await renderWithProviders(<PatientAppointmentsScreen />)
    await screen.findByTestId('patient-appointment-appt-1')

    expect(screen.getByTestId('patient-appointments-pagination')).toHaveTextContent(
      /Página 1 de 3/,
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-next'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    )
  })

  it('volta uma página', async () => {
    mockList.mockResolvedValue(page([appointment()], 25))

    await renderWithProviders(<PatientAppointmentsScreen />)
    await screen.findByTestId('patient-appointment-appt-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-next'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('patient-appointments-pagination')).toHaveTextContent(
        /Página 2 de 3/,
      ),
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-appointments-previous'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    )
  })

  // Nas pontas o botão não leva a lugar nenhum, e um botão que não faz nada
  // é pior do que um botão apagado.
  it('nas pontas os botões ficam apagados', async () => {
    mockList.mockResolvedValue(page([appointment()], 25))

    await renderWithProviders(<PatientAppointmentsScreen />)
    await screen.findByTestId('patient-appointment-appt-1')

    expect(screen.getByTestId('patient-appointments-previous')).toBeDisabled()
    expect(screen.getByTestId('patient-appointments-next')).not.toBeDisabled()
  })

  it('uma página só não mostra paginação', async () => {
    await renderWithProviders(<PatientAppointmentsScreen />)

    await screen.findByTestId('patient-appointment-appt-1')
    expect(screen.queryByTestId('patient-appointments-pagination')).toBeNull()
  })

  /**
   * O backend já recorta o PROFESSIONAL às próprias consultas. Oferecer-lhe
   * o seletor sugeriria que existe mais alguma coisa para ver, e escolher
   * outro profissional devolveria uma lista vazia sem explicação.
   */
  it('o profissional não vê o seletor', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<PatientAppointmentsScreen />)

    await screen.findByTestId('patient-appointment-appt-1')
    expect(screen.queryByTestId('patient-appointments-professional')).toBeNull()
    expect(mockProfessionals).not.toHaveBeenCalled()
  })

  it('a recepção vê o seletor', async () => {
    asRole(UserRole.USER)

    await renderWithProviders(<PatientAppointmentsScreen />)

    expect(await screen.findByTestId('patient-appointments-professional')).toBeTruthy()
  })
})
