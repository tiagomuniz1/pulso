import { DayOfWeek, UserRole } from '@app/shared'
import {
  createScheduleUseCase,
  getScheduleUseCase,
  listProfessionalsUseCase,
  updateScheduleUseCase,
  type IScheduleModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { EditScheduleScreen, NewScheduleScreen } from './schedule-form.screen'

jest.mock('@app/core/src/features/schedules/use-cases/create-schedule.use-case')
jest.mock('@app/core/src/features/schedules/use-cases/update-schedule.use-case')
jest.mock('@app/core/src/features/schedules/use-cases/get-schedule.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'sch-1' }),
}))

const mockCreate = createScheduleUseCase as jest.MockedFunction<typeof createScheduleUseCase>
const mockUpdate = updateScheduleUseCase as jest.MockedFunction<typeof updateScheduleUseCase>
const mockGet = getScheduleUseCase as jest.MockedFunction<typeof getScheduleUseCase>

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

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u-1', fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockGet.mockResolvedValue(schedule())
  mockCreate.mockResolvedValue(schedule())
  mockUpdate.mockResolvedValue(schedule())
  ;(listProfessionalsUseCase as jest.Mock).mockResolvedValue([
    { id: 'prof-1', user: { id: 'u-1', fullName: 'Dra. Ana' } },
  ])
})

async function preencher() {
  await act(async () => {
    screen.getByTestId('schedule-form-start').props.onChangeText('0800')
    screen.getByTestId('schedule-form-end').props.onChangeText('1700')
  })
  await act(async () => {
    fireEvent.press(screen.getByTestId('schedule-form-day-MONDAY'))
  })
}

describe('NewScheduleScreen', () => {
  it('o ADMIN escolhe o profissional e cria', async () => {
    await renderWithProviders(<NewScheduleScreen />)
    await preencher()

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-professional'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('schedule-form-professional-option-prof-1'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        professionalId: 'prof-1',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '17:00',
        slotDurationInMinutes: 30,
        validFrom: undefined,
        validUntil: undefined,
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('sem profissional, não envia', async () => {
    await renderWithProviders(<NewScheduleScreen />)
    await preencher()

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByTestId('schedule-form-professional-error')).toBeTruthy()
  })

  /**
   * O PROFESSIONAL cria só a própria agenda, e o servidor a deduz do
   * `userId` — oferecer-lhe o seletor seria oferecer um caminho que
   * termina em `403`.
   */
  it('o profissional não escolhe ninguém', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<NewScheduleScreen />)
    expect(screen.queryByTestId('schedule-form-professional')).toBeNull()

    await preencher()
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('professionalId')
  })

  it('converte as datas de validade para o formato da API', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<NewScheduleScreen />)
    await preencher()
    await act(async () => {
      screen.getByTestId('schedule-form-valid-from').props.onChangeText('01012026')
      screen.getByTestId('schedule-form-valid-until').props.onChangeText('31122026')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ validFrom: '2026-01-01', validUntil: '2026-12-31' }),
      ),
    )
  })

  it('mostra o conflito de horário sem sair da tela', async () => {
    asRole(UserRole.PROFESSIONAL)
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<NewScheduleScreen />)
    await preencher()
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    expect(await screen.findByTestId('schedule-form-error')).toHaveTextContent(/Já existe uma agenda/)
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<NewScheduleScreen />)

    fireEvent.press(screen.getByTestId('schedule-new-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})

describe('EditScheduleScreen', () => {
  it('abre preenchido e salva', async () => {
    await renderWithProviders(<EditScheduleScreen />)

    await screen.findByTestId('schedule-form')
    expect(screen.getByTestId('schedule-form-start').props.value).toBe('07:00')
    expect(screen.getByTestId('schedule-form-duration').props.value).toBe('30')

    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('sch-1', expect.anything()))
    expect(mockBack).toHaveBeenCalled()
  })

  it('na edição não se troca o dono da agenda', async () => {
    await renderWithProviders(<EditScheduleScreen />)

    await screen.findByTestId('schedule-form')
    expect(screen.queryByTestId('schedule-form-professional')).toBeNull()
  })

  it('abre com as datas de validade preenchidas', async () => {
    mockGet.mockResolvedValue(schedule({ validFrom: '2026-01-01', validUntil: '2026-12-31' }))

    await renderWithProviders(<EditScheduleScreen />)

    await screen.findByTestId('schedule-form')
    expect(screen.getByTestId('schedule-form-valid-from').props.value).toBe('01/01/2026')
    expect(screen.getByTestId('schedule-form-valid-until').props.value).toBe('31/12/2026')
  })

  it('mantendo as datas, elas voltam no formato da API', async () => {
    mockGet.mockResolvedValue(schedule({ validFrom: '2026-01-01', validUntil: '2026-12-31' }))

    await renderWithProviders(<EditScheduleScreen />)
    await screen.findByTestId('schedule-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        'sch-1',
        expect.objectContaining({ validFrom: '2026-01-01', validUntil: '2026-12-31' }),
      ),
    )
  })

  /**
   * Apagar a data tem de **remover** o limite. `undefined` diria ao backend
   * "não mexa neste campo", e a agenda continuaria encerrando na data
   * antiga.
   */
  it('apagar a validade manda null', async () => {
    mockGet.mockResolvedValue(schedule({ validFrom: '2026-01-01', validUntil: '2026-12-31' }))

    await renderWithProviders(<EditScheduleScreen />)
    await screen.findByTestId('schedule-form')
    await act(async () => {
      screen.getByTestId('schedule-form-valid-from').props.onChangeText('')
      screen.getByTestId('schedule-form-valid-until').props.onChangeText('')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        'sch-1',
        expect.objectContaining({ validFrom: null, validUntil: null }),
      ),
    )
  })

  // O campo é numérico, mas colar aceita qualquer coisa — e aqui o recorte
  // é melhor do que a mensagem: não há "duração com letra" a explicar.
  it('a duração aceita só dígitos, até três', async () => {
    await renderWithProviders(<EditScheduleScreen />)
    await screen.findByTestId('schedule-form')

    await act(async () => {
      screen.getByTestId('schedule-form-duration').props.onChangeText('4a5')
    })
    expect(screen.getByTestId('schedule-form-duration').props.value).toBe('45')

    await act(async () => {
      screen.getByTestId('schedule-form-duration').props.onChangeText('1234')
    })
    expect(screen.getByTestId('schedule-form-duration').props.value).toBe('123')
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<EditScheduleScreen />)
    expect(screen.getByTestId('schedule-edit-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<EditScheduleScreen />)
    fireEvent.press(await screen.findByTestId('schedule-edit-error-retry'))

    expect(await screen.findByTestId('schedule-form')).toBeTruthy()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<EditScheduleScreen />)
    await screen.findByTestId('schedule-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('schedule-form-submit'))
    })

    expect(await screen.findByTestId('schedule-form-error')).toHaveTextContent(
      /Não foi possível salvar/,
    )
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<EditScheduleScreen />)

    fireEvent.press(screen.getByTestId('schedule-edit-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})
