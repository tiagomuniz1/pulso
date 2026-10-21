import { DayOfWeek, UserRole } from '@app/shared'
import {
  deleteScheduleUseCase,
  listProfessionalsUseCase,
  listSchedulesUseCase,
  type IScheduleModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { ScheduleListScreen } from './schedule-list.screen'

jest.mock('@app/core/src/features/schedules/use-cases/list-schedules.use-case')
jest.mock('@app/core/src/features/schedules/use-cases/delete-schedule.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listSchedulesUseCase as jest.MockedFunction<typeof listSchedulesUseCase>
const mockDelete = deleteScheduleUseCase as jest.MockedFunction<typeof deleteScheduleUseCase>
const mockProfessionals = listProfessionalsUseCase as jest.MockedFunction<
  typeof listProfessionalsUseCase
>

const schedule = (overrides: Partial<IScheduleModel> = {}): IScheduleModel =>
  ({
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
    ...overrides,
  }) as IScheduleModel

const page = (data: IScheduleModel[], total = data.length) =>
  ({ data, total, page: 1, limit: 20 }) as never

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u-1', fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockList.mockResolvedValue(page([schedule()]))
  mockDelete.mockResolvedValue(undefined)
  mockProfessionals.mockResolvedValue([
    { id: 'prof-1', user: { id: 'u-1', fullName: 'Dra. Ana' } },
    { id: 'prof-2', user: { id: 'u-2', fullName: 'Dr. Bruno' } },
  ] as never)
})

describe('ScheduleListScreen', () => {
  it('mostra dia, horário, duração e validade', async () => {
    await renderWithProviders(<ScheduleListScreen />)

    const card = await screen.findByTestId('schedule-card-sch-1')
    expect(card).toHaveTextContent(/Dra\. Ana/)
    expect(card).toHaveTextContent(/Quarta-feira/)
    expect(card).toHaveTextContent(/07:00 — 08:00/)
    expect(card).toHaveTextContent(/30 min/)
    expect(card).toHaveTextContent(/Indefinida/)
  })

  /**
   * Uma agenda sem datas vale para sempre, e é o caso comum — escrever
   * "— / —" ocuparia a linha sem dizer nada.
   */
  it.each([
    ['só com início', { validFrom: '2026-01-01', validUntil: null }, /A partir de 01\/01\/2026/],
    ['só com fim', { validFrom: null, validUntil: '2026-12-31' }, /Até 31\/12\/2026/],
    [
      'com as duas',
      { validFrom: '2026-01-01', validUntil: '2026-12-31' },
      /01\/01\/2026 — 31\/12\/2026/,
    ],
  ])('mostra a validade %s', async (_caso, overrides, expected) => {
    mockList.mockResolvedValue(page([schedule(overrides)]))

    await renderWithProviders(<ScheduleListScreen />)

    expect(await screen.findByTestId('schedule-card-sch-1')).toHaveTextContent(expected)
  })

  it('conta no singular', async () => {
    await renderWithProviders(<ScheduleListScreen />)
    expect(await screen.findByTestId('schedule-list-header-subtitle')).toHaveTextContent(
      /^1 agenda encontrada$/,
    )
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<ScheduleListScreen />)
    expect(screen.getByTestId('schedule-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<ScheduleListScreen />)
    fireEvent.press(await screen.findByTestId('schedule-list-error-retry'))

    expect(await screen.findByTestId('schedule-card-sch-1')).toBeTruthy()
  })

  it('diz quando não há agenda', async () => {
    mockList.mockResolvedValue(page([]))
    await renderWithProviders(<ScheduleListScreen />)
    expect(await screen.findByTestId('schedule-list-empty')).toHaveTextContent(
      /Nenhuma agenda cadastrada/,
    )
  })

  it('filtra por profissional', async () => {
    await renderWithProviders(<ScheduleListScreen />)
    await screen.findByTestId('schedule-card-sch-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-list-professional'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('schedule-list-professional-option-prof-2'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ professionalId: 'prof-2' }),
      ),
    )
  })

  it('filtra por dia da semana', async () => {
    await renderWithProviders(<ScheduleListScreen />)
    await screen.findByTestId('schedule-card-sch-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-list-day'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('schedule-list-day-option-MONDAY'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ dayOfWeek: DayOfWeek.MONDAY }),
      ),
    )
  })

  it('com filtro e sem resultado, diz que foi o filtro', async () => {
    await renderWithProviders(<ScheduleListScreen />)
    await screen.findByTestId('schedule-card-sch-1')

    mockList.mockResolvedValue(page([]))
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-list-day'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('schedule-list-day-option-MONDAY'))
    })

    await waitFor(() =>
      expect(screen.getByTestId('schedule-list-empty')).toHaveTextContent(
        /Nenhuma agenda para este filtro/,
      ),
    )
  })

  /**
   * Agenda encerrada some por padrão. Sem este interruptor não haveria como
   * achar a que acabou ontem — e é justamente a que se quer conferir quando
   * um horário some da grade.
   */
  it('mostra as expiradas quando pedido', async () => {
    await renderWithProviders(<ScheduleListScreen />)
    await screen.findByTestId('schedule-card-sch-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-list-expired-expired'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ includeExpired: true })),
    )
  })

  it('por padrão não pede as expiradas', async () => {
    await renderWithProviders(<ScheduleListScreen />)

    await screen.findByTestId('schedule-card-sch-1')
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ includeExpired: undefined }),
    )
  })

  it('exclui pedindo confirmação e avisa', async () => {
    await renderWithProviders(<ScheduleListScreen />)

    fireEvent.press(await screen.findByTestId('schedule-card-delete-sch-1'))
    fireEvent.press(await screen.findByTestId('schedule-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('sch-1'))
    expect(await screen.findByTestId('schedule-list-success')).toHaveTextContent(
      /Agenda de Dra\. Ana excluída/,
    )
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<ScheduleListScreen />)

    fireEvent.press(await screen.findByTestId('schedule-card-delete-sch-1'))
    fireEvent.press(await screen.findByTestId('schedule-delete-dialog-cancel'))

    await waitFor(() => expect(screen.queryByTestId('schedule-delete-dialog-message')).toBeNull())
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<ScheduleListScreen />)
    fireEvent.press(await screen.findByTestId('schedule-card-delete-sch-1'))
    fireEvent.press(await screen.findByTestId('schedule-delete-dialog-confirm'))

    await waitFor(() => expect(screen.queryByTestId('schedule-delete-dialog-message')).toBeNull())
    expect(screen.queryByTestId('schedule-list-success')).toBeNull()
  })

  it.each([
    ['abre o detalhe', 'schedule-card-open-sch-1', '/(app)/schedules/sch-1'],
    ['abre a edição', 'schedule-card-edit-sch-1', '/(app)/schedules/sch-1/edit'],
    ['abre o cadastro', 'schedule-list-new', '/(app)/schedules/new'],
  ])('%s', async (_caso, testID, route) => {
    await renderWithProviders(<ScheduleListScreen />)

    fireEvent.press(await screen.findByTestId(testID))

    expect(mockPush).toHaveBeenCalledWith(route)
  })

  /**
   * O PROFESSIONAL recebe só as próprias agendas — recorte do servidor — e
   * por isso o seletor não lhe é oferecido: escolher outro devolveria lista
   * vazia sem explicação. Gerir, ele gere: são as dele.
   */
  it('o profissional não vê o seletor, mas gere as próprias', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<ScheduleListScreen />)

    expect(await screen.findByTestId('schedule-card-sch-1')).toBeTruthy()
    expect(screen.queryByTestId('schedule-list-professional')).toBeNull()
    expect(screen.getByTestId('schedule-card-edit-sch-1')).toBeTruthy()
    expect(screen.getByTestId('schedule-list-new')).toBeTruthy()
  })
})
