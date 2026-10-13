import { AppointmentCancellationScope, AppointmentStatus, PatientGender } from '@app/shared'
import { cancelAppointmentUseCase, completeAppointmentUseCase, getAppointmentUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { AppointmentDetailScreen } from './appointment-detail.screen'
import { addDays, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/get-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/cancel-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/complete-appointment.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ id: 'appt-1' }),
}))

const mockGet = getAppointmentUseCase as jest.MockedFunction<typeof getAppointmentUseCase>
const mockCancel = cancelAppointmentUseCase as jest.MockedFunction<typeof cancelAppointmentUseCase>
const mockComplete = completeAppointmentUseCase as jest.MockedFunction<
  typeof completeAppointmentUseCase
>

const detail = (overrides = {}) => ({
  id: 'appt-1',
  professionalId: 'doc-1',
  professionalName: 'Dra. Ana',
  patientId: 'pat-1',
  patientName: 'Maria Silva',
  specialtyId: 'spec-1',
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
  seriesFutureCount: null,
  isFirstVisitWithProfessional: false,
  label: null,
  patient: {
    fullName: 'Maria Silva',
    email: 'maria@exemplo.test',
    phoneNumber: '(81) 99999-0000',
    birthDate: new Date(1990, 4, 20),
    documentNumber: null,
    gender: PatientGender.FEMALE,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('AppointmentDetailScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows the spinner while loading', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)

    expect(screen.getByTestId('appointment-loading')).toBeTruthy()
  })

  it('offers to try again when the appointment fails to load', async () => {
    mockGet.mockRejectedValue(new Error('rede'))

    await renderWithProviders(<AppointmentDetailScreen />)
    expect(await screen.findByTestId('appointment-error')).toBeTruthy()

    mockGet.mockResolvedValue(detail() as never)
    fireEvent.press(screen.getByTestId('appointment-error-retry'))

    expect(await screen.findByTestId('patient-card')).toBeTruthy()
  })

  describe('a paciente', () => {
    it('shows name, age, gender and phone', async () => {
      mockGet.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByText('Maria Silva')).toBeTruthy()
      expect(screen.getByTestId('patient-gender')).toHaveTextContent('Feminino')
      expect(screen.getByTestId('patient-phone')).toHaveTextContent('(81) 99999-0000')
    })

    // A idade é o que se lê de relance; a data de nascimento exige conta.
    it.each([
      [new Date(1990, 0, 1), 'anos'],
      [new Date(2000, 11, 31), 'anos'],
    ])('turns the birth date into an age', async (birthDate) => {
      mockGet.mockResolvedValue(detail({ patient: { ...detail().patient, birthDate } }) as never)

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('patient-age')).toHaveTextContent(/^\d+ anos$/)
    })

    // Aniversário que ainda não chegou neste ano não conta.
    it('does not count a birthday that has not come yet this year', async () => {
      const today = new Date()
      const birthDate = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate() + 1)
      mockGet.mockResolvedValue(detail({ patient: { ...detail().patient, birthDate } }) as never)

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('patient-age')).toHaveTextContent('29 anos')
    })

    it('shows the first-visit badge only on a first visit', async () => {
      mockGet.mockResolvedValue(detail({ isFirstVisitWithProfessional: true }) as never)

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('first-visit-badge')).toHaveTextContent(
        /Primeira vez com Dra\. Ana/,
      )
    })

    it('hides the badge for a patient already seen', async () => {
      mockGet.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('patient-card')

      expect(screen.queryByTestId('first-visit-badge')).toBeNull()
    })
  })

  describe('a consulta', () => {
    it('shows when, who and the status', async () => {
      mockGet.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('appointment-when')).toHaveTextContent(/às 09:00$/)
      expect(screen.getByTestId('appointment-professional')).toHaveTextContent('Dra. Ana')
      expect(screen.getByTestId('appointment-specialty')).toHaveTextContent('Ginecologia')
      expect(screen.getByTestId('appointment-status')).toHaveTextContent('Agendada')
    })

    it('omits specialty, reason and cancellation when there is none', async () => {
      mockGet.mockResolvedValue(detail({ specialtyName: null }) as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-card')

      expect(screen.queryByTestId('appointment-specialty')).toBeNull()
      expect(screen.queryByTestId('appointment-reason')).toBeNull()
      expect(screen.queryByTestId('appointment-cancellation-reason')).toBeNull()
    })

    it('shows the reason and the cancellation reason when they exist', async () => {
      mockGet.mockResolvedValue(
        detail({
          reason: 'Dor abdominal',
          status: AppointmentStatus.CANCELLED,
          cancellationReason: 'Paciente remarcou',
        }) as never,
      )

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('appointment-reason')).toHaveTextContent('Dor abdominal')
      expect(screen.getByTestId('appointment-cancellation-reason')).toHaveTextContent(
        'Paciente remarcou',
      )
    })
  })

  it('opens the medical record', async () => {
    mockGet.mockResolvedValue(detail() as never)

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('open-medical-record'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/appointments/appt-1/medical-record')
  })

  describe('concluir', () => {
    it('completes the appointment', async () => {
      mockGet.mockResolvedValue(detail() as never)
      mockComplete.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('complete-appointment'))

      await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('appt-1'))
    })

    // O backend recusa concluir consulta futura com 422; oferecer o botão
    // seria oferecer um caminho que só termina em erro.
    it('hides the button for an appointment still in the future', async () => {
      mockGet.mockResolvedValue(detail({ date: addDays(todayIsoDate(), 1) }) as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-card')

      expect(screen.queryByTestId('complete-appointment')).toBeNull()
    })

    it.each([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED])(
      'hides both actions when the appointment is %s',
      async (status) => {
        mockGet.mockResolvedValue(detail({ status }) as never)

        await renderWithProviders(<AppointmentDetailScreen />)
        await screen.findByTestId('appointment-card')

        expect(screen.queryByTestId('complete-appointment')).toBeNull()
        expect(screen.queryByTestId('start-cancel')).toBeNull()
      },
    )

    it('says something when the action fails', async () => {
      mockGet.mockResolvedValue(detail() as never)
      mockComplete.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('complete-appointment'))

      expect(await screen.findByTestId('action-error')).toBeTruthy()
    })
  })

  describe('cancelar', () => {
    // Cancelar é irreversível e um toque acidental é barato num celular: o
    // motivo entra antes, no mesmo gesto que confirma.
    it('asks for the reason before confirming', async () => {
      mockGet.mockResolvedValue(detail() as never)
      mockCancel.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('start-cancel'))

      const reason = await screen.findByTestId('cancel-reason')
      fireEvent.changeText(reason, 'Paciente avisou que não vem')
      // O React 19 agenda o estado; sem esperar, o toque confirma o valor antigo.
      await waitFor(() =>
        expect(screen.getByTestId('cancel-reason').props.value).toBe(
          'Paciente avisou que não vem',
        ),
      )

      fireEvent.press(screen.getByTestId('confirm-cancel'))

      await waitFor(() =>
        expect(mockCancel).toHaveBeenCalledWith('appt-1', {
          cancellationReason: 'Paciente avisou que não vem',
          // Só esta ocorrência: cancelar a série inteira do celular é fácil
          // demais de fazer sem querer e exige reagendar uma por uma.
          scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
        }),
      )
    })

    it('backs out without cancelling', async () => {
      mockGet.mockResolvedValue(detail() as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('start-cancel'))
      fireEvent.press(await screen.findByTestId('abort-cancel'))

      await waitFor(() => expect(screen.getByTestId('start-cancel')).toBeTruthy())
      expect(screen.queryByTestId('cancel-card')).toBeNull()
      expect(mockCancel).not.toHaveBeenCalled()
    })
  })
})
