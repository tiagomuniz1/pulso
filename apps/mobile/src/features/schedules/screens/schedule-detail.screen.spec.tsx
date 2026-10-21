import { DayOfWeek } from '@app/shared'
import { deleteScheduleUseCase, getScheduleUseCase, type IScheduleModel } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { ScheduleDetailScreen } from './schedule-detail.screen'

jest.mock('@app/core/src/features/schedules/use-cases/get-schedule.use-case')
jest.mock('@app/core/src/features/schedules/use-cases/delete-schedule.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'sch-1' }),
}))

const mockGet = getScheduleUseCase as jest.MockedFunction<typeof getScheduleUseCase>
const mockDelete = deleteScheduleUseCase as jest.MockedFunction<typeof deleteScheduleUseCase>

const schedule: IScheduleModel = {
  id: 'sch-1',
  professionalId: 'prof-1',
  professionalName: 'Dra. Ana',
  dayOfWeek: DayOfWeek.WEDNESDAY,
  startTime: '07:00:00',
  endTime: '08:00:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(2026, 9, 20),
  updatedAt: new Date(2026, 9, 20),
} as IScheduleModel

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(schedule)
  mockDelete.mockResolvedValue(undefined)
})

describe('ScheduleDetailScreen', () => {
  it('mostra profissional, dia, horário, duração e validade', async () => {
    await renderWithProviders(<ScheduleDetailScreen />)

    expect(await screen.findByTestId('schedule-details-professional')).toHaveTextContent(/Dra\. Ana/)
    expect(screen.getByTestId('schedule-details-day')).toHaveTextContent(/^Quarta-feira$/)
    expect(screen.getByTestId('schedule-details-time')).toHaveTextContent(/^07:00 — 08:00$/)
    expect(screen.getByTestId('schedule-details-duration')).toHaveTextContent(/^30 minutos$/)
    expect(screen.getByTestId('schedule-details-validity')).toHaveTextContent(/^Indefinida$/)
  })

  it('abre a edição', async () => {
    await renderWithProviders(<ScheduleDetailScreen />)

    fireEvent.press(await screen.findByTestId('schedule-details-edit'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/schedules/sch-1/edit')
  })

  it('exclui e volta', async () => {
    await renderWithProviders(<ScheduleDetailScreen />)

    fireEvent.press(await screen.findByTestId('schedule-details-delete'))
    fireEvent.press(await screen.findByTestId('schedule-detail-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('sch-1'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<ScheduleDetailScreen />)
    fireEvent.press(await screen.findByTestId('schedule-details-delete'))
    fireEvent.press(await screen.findByTestId('schedule-detail-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('schedule-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<ScheduleDetailScreen />)

    fireEvent.press(await screen.findByTestId('schedule-details-delete'))
    fireEvent.press(await screen.findByTestId('schedule-detail-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('schedule-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<ScheduleDetailScreen />)

    fireEvent.press(await screen.findByTestId('schedule-detail-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<ScheduleDetailScreen />)
    expect(screen.getByTestId('schedule-detail-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<ScheduleDetailScreen />)
    fireEvent.press(await screen.findByTestId('schedule-detail-error-retry'))

    expect(await screen.findByTestId('schedule-details-professional')).toBeTruthy()
  })
})
