import { getDashboardStatsUseCase, type IDashboardModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { DashboardScreen } from './dashboard.screen'

jest.mock('@app/core/src/features/dashboard/use-cases/get-dashboard-stats.use-case')

const mockStats = getDashboardStatsUseCase as jest.MockedFunction<typeof getDashboardStatsUseCase>

const stats = (overrides: Partial<IDashboardModel> = {}): IDashboardModel => ({
  period: { from: new Date(2026, 8, 22), to: new Date(2026, 9, 21) },
  kpi: { scheduled: 174, confirmed: 3, completed: 6, noShow: 1 },
  patients: {
    total: 99,
    newPatients: 97,
    returningPatients: 2,
    byGender: { male: 40, female: 59 },
  },
  procedures: {
    total: 6,
    items: [
      { label: 'Sem especialidade', value: 3 },
      { label: 'Ginecologia', value: 2 },
      { label: 'Cardiologia', value: 1 },
    ],
  },
  insurance: { total: 10, particular: 7, convenio: 3 },
  cidRanking: { total: 0, items: [] },
  appointmentsByDay: [
    { date: new Date(2026, 8, 22), count: 2 },
    { date: new Date(2026, 8, 23), count: 4 },
  ],
  ageDistribution: [
    { age: 30, count: 2 },
    { age: 36, count: 3 },
  ],
  todayBirthdays: [],
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ now: new Date(2026, 9, 21, 10, 0, 0), advanceTimers: true })
  mockStats.mockResolvedValue(stats())
})

afterEach(() => {
  jest.useRealTimers()
})

describe('DashboardScreen', () => {
  it('abre nos últimos trinta dias', async () => {
    await renderWithProviders(<DashboardScreen />)

    expect(screen.getByTestId('dashboard-date-from').props.value).toBe('22/09/2026')
    expect(screen.getByTestId('dashboard-date-to').props.value).toBe('21/10/2026')
    await waitFor(() =>
      expect(mockStats).toHaveBeenCalledWith({ from: '2026-09-22', to: '2026-10-21' }),
    )
  })

  it('mostra os quatro indicadores', async () => {
    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-kpi-scheduled')).toHaveTextContent(/174/)
    expect(screen.getByTestId('dashboard-kpi-confirmed')).toHaveTextContent(/Confirmados/)
    expect(screen.getByTestId('dashboard-kpi-confirmed')).toHaveTextContent(/3/)
    expect(screen.getByTestId('dashboard-kpi-completed')).toHaveTextContent(/6/)
    expect(screen.getByTestId('dashboard-kpi-no-show')).toHaveTextContent(/Faltaram/)
  })

  it('trata carregando', async () => {
    mockStats.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<DashboardScreen />)

    expect(screen.getByTestId('dashboard-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockStats.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<DashboardScreen />)

    fireEvent.press(await screen.findByTestId('dashboard-error-retry'))
    await waitFor(() => expect(mockStats).toHaveBeenCalledTimes(2))
  })

  it('refaz a consulta com a data nova', async () => {
    await renderWithProviders(<DashboardScreen />)
    await screen.findByTestId('dashboard-kpi-scheduled')

    await act(async () => {
      screen.getByTestId('dashboard-date-from').props.onChangeText('01102026')
    })

    await waitFor(() =>
      expect(mockStats).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-21' }),
    )
  })

  it('refaz a consulta com a data final nova', async () => {
    await renderWithProviders(<DashboardScreen />)
    await screen.findByTestId('dashboard-kpi-scheduled')

    await act(async () => {
      screen.getByTestId('dashboard-date-to').props.onChangeText('15102026')
    })

    await waitFor(() =>
      expect(mockStats).toHaveBeenLastCalledWith({ from: '2026-09-22', to: '2026-10-15' }),
    )
  })

  /**
   * A cada dígito o texto é uma data diferente — aceitar a parcial pediria
   * ao servidor trinta períodos que ninguém quis ver.
   */
  it('data pela metade não dispara consulta', async () => {
    await renderWithProviders(<DashboardScreen />)
    await screen.findByTestId('dashboard-kpi-scheduled')
    const before = mockStats.mock.calls.length

    await act(async () => {
      screen.getByTestId('dashboard-date-from').props.onChangeText('0110')
    })

    expect(screen.getByTestId('dashboard-date-from').props.value).toBe('01/10')
    expect(mockStats).toHaveBeenCalledTimes(before)
  })

  // 31/02 passa por qualquer regex e não é dia nenhum.
  it('data que não existe não dispara consulta', async () => {
    await renderWithProviders(<DashboardScreen />)
    await screen.findByTestId('dashboard-kpi-scheduled')
    const before = mockStats.mock.calls.length

    await act(async () => {
      screen.getByTestId('dashboard-date-from').props.onChangeText('31022026')
    })

    expect(mockStats).toHaveBeenCalledTimes(before)
  })

  it('data final pela metade também não dispara', async () => {
    await renderWithProviders(<DashboardScreen />)
    await screen.findByTestId('dashboard-kpi-scheduled')
    const before = mockStats.mock.calls.length

    await act(async () => {
      screen.getByTestId('dashboard-date-to').props.onChangeText('1510')
    })

    expect(screen.getByTestId('dashboard-date-to').props.value).toBe('15/10')
    expect(mockStats).toHaveBeenCalledTimes(before)
  })

  it('aplica a máscara enquanto se digita', async () => {
    await renderWithProviders(<DashboardScreen />)

    await act(async () => {
      screen.getByTestId('dashboard-date-to').props.onChangeText('011020269999')
    })

    expect(screen.getByTestId('dashboard-date-to').props.value).toBe('01/10/2026')
  })
})

describe('DashboardScreen, os gráficos', () => {
  it('a rosca de pacientes traz novos, recorrentes e o rodapé', async () => {
    await renderWithProviders(<DashboardScreen />)

    const card = await screen.findByTestId('dashboard-patients-chart')
    expect(card).toHaveTextContent(/Novos/)
    expect(card).toHaveTextContent(/97/)
    expect(card).toHaveTextContent(/Recorrentes/)
    expect(card).toHaveTextContent(/Homens/)
    expect(card).toHaveTextContent(/Total/)
    expect(screen.getByTestId('dashboard-patients-donut')).toBeTruthy()
  })

  it('sem paciente no período, avisa em vez de desenhar', async () => {
    mockStats.mockResolvedValue(
      stats({
        patients: { total: 0, newPatients: 0, returningPatients: 0, byGender: { male: 0, female: 0 } },
      }),
    )

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-patients-empty')).toBeTruthy()
    expect(screen.queryByTestId('dashboard-patients-donut')).toBeNull()
  })

  it('a rosca de procedimentos traz o total no meio', async () => {
    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-procedures-donut-total')).toHaveTextContent('6')
  })

  // A rosca já diz a proporção; vinte especialidades na legenda empurrariam
  // o resto do painel para fora da tela.
  it('a legenda de procedimentos mostra no máximo quatro', async () => {
    mockStats.mockResolvedValue(
      stats({
        procedures: {
          total: 15,
          items: [
            { label: 'A', value: 5 },
            { label: 'B', value: 4 },
            { label: 'C', value: 3 },
            { label: 'D', value: 2 },
            { label: 'E', value: 1 },
          ],
        },
      }),
    )

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-procedures-item-3')).toBeTruthy()
    expect(screen.queryByTestId('dashboard-procedures-item-4')).toBeNull()
  })

  it('sem procedimento, avisa', async () => {
    mockStats.mockResolvedValue(stats({ procedures: { total: 0, items: [] } }))

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-procedures-empty')).toBeTruthy()
  })

  it('a rosca de convênio traz particular e convênio', async () => {
    await renderWithProviders(<DashboardScreen />)

    const card = await screen.findByTestId('dashboard-insurance-chart')
    expect(card).toHaveTextContent(/Particular/)
    expect(card).toHaveTextContent(/Convênio/)
    expect(screen.getByTestId('dashboard-insurance-donut-total')).toHaveTextContent('10')
  })

  it('sem dado de convênio, avisa', async () => {
    mockStats.mockResolvedValue(stats({ insurance: { total: 0, particular: 0, convenio: 0 } }))

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-insurance-empty')).toBeTruthy()
  })

  it('desenha a linha do período e a distribuição etária', async () => {
    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-timeline-line')).toBeTruthy()
    expect(screen.getByTestId('dashboard-age-line')).toBeTruthy()
  })

  /**
   * Período com dias, todos zerados, é diferente de período sem dias: o
   * gráfico existe e a linha fica na base. Dividir pelo máximo zero faria
   * o caminho sair como `NaN`, que o SVG desenha como nada — sem erro e
   * sem ninguém perceber.
   */
  it('período inteiro sem atendimento ainda desenha a linha', async () => {
    mockStats.mockResolvedValue(
      stats({
        appointmentsByDay: [
          { date: new Date(2026, 8, 22), count: 0 },
          { date: new Date(2026, 8, 23), count: 0 },
        ],
      }),
    )

    await renderWithProviders(<DashboardScreen />)

    const line = await screen.findByTestId('dashboard-timeline-line-line')
    expect(line.props.d).not.toMatch(/NaN/)
    expect(screen.queryByTestId('dashboard-timeline-empty')).toBeNull()
  })

  it('sem dia nenhum no período, avisa', async () => {
    mockStats.mockResolvedValue(stats({ appointmentsByDay: [] }))

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-timeline-empty')).toBeTruthy()
  })

  it('sem distribuição etária, avisa', async () => {
    mockStats.mockResolvedValue(stats({ ageDistribution: [] }))

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-age-empty')).toBeTruthy()
  })
})

describe('DashboardScreen, os aniversariantes', () => {
  const birthday = (index: number) => ({
    patientId: `p${index}`,
    fullName: `Paciente ${index}`,
    age: 30 + index,
  })

  it('diz quando não há aniversariante', async () => {
    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-birthdays-empty')).toBeTruthy()
  })

  it('lista nome e idade', async () => {
    mockStats.mockResolvedValue(stats({ todayBirthdays: [birthday(1)] }))

    await renderWithProviders(<DashboardScreen />)

    const row = await screen.findByTestId('dashboard-birthday-p1')
    expect(row).toHaveTextContent(/Paciente 1/)
    expect(row).toHaveTextContent(/31 anos/)
  })

  // Cinco é o que cabe sem empurrar os gráficos para baixo.
  it('mostra cinco e esconde o resto', async () => {
    mockStats.mockResolvedValue(
      stats({ todayBirthdays: [1, 2, 3, 4, 5, 6].map(birthday) }),
    )

    await renderWithProviders(<DashboardScreen />)

    expect(await screen.findByTestId('dashboard-birthday-p5')).toBeTruthy()
    expect(screen.queryByTestId('dashboard-birthday-p6')).toBeNull()
    expect(screen.getByTestId('dashboard-birthdays-toggle')).toHaveTextContent('Ver mais (6)')
  })

  it('com cinco ou menos, não oferece ver mais', async () => {
    mockStats.mockResolvedValue(stats({ todayBirthdays: [1, 2].map(birthday) }))

    await renderWithProviders(<DashboardScreen />)

    await screen.findByTestId('dashboard-birthday-p1')
    expect(screen.queryByTestId('dashboard-birthdays-toggle')).toBeNull()
  })

  it('ver mais abre o resto e a busca', async () => {
    mockStats.mockResolvedValue(
      stats({ todayBirthdays: [1, 2, 3, 4, 5, 6].map(birthday) }),
    )

    await renderWithProviders(<DashboardScreen />)
    await act(async () => {
      fireEvent.press(await screen.findByTestId('dashboard-birthdays-toggle'))
    })

    expect(screen.getByTestId('dashboard-birthday-p6')).toBeTruthy()
    expect(screen.getByTestId('dashboard-birthdays-search')).toBeTruthy()
    expect(screen.getByTestId('dashboard-birthdays-toggle')).toHaveTextContent('Ver menos')
  })

  it('filtra por nome', async () => {
    mockStats.mockResolvedValue(
      stats({
        todayBirthdays: [
          { patientId: 'p1', fullName: 'Ana Costa', age: 30 },
          { patientId: 'p2', fullName: 'Bruno Lima', age: 40 },
          ...[3, 4, 5, 6].map(birthday),
        ],
      }),
    )

    await renderWithProviders(<DashboardScreen />)
    await act(async () => {
      fireEvent.press(await screen.findByTestId('dashboard-birthdays-toggle'))
    })
    await act(async () => {
      screen.getByTestId('dashboard-birthdays-search').props.onChangeText('ana')
    })

    expect(screen.getByTestId('dashboard-birthday-p1')).toBeTruthy()
    expect(screen.queryByTestId('dashboard-birthday-p2')).toBeNull()
  })

  it('busca sem resultado diz isso', async () => {
    mockStats.mockResolvedValue(
      stats({ todayBirthdays: [1, 2, 3, 4, 5, 6].map(birthday) }),
    )

    await renderWithProviders(<DashboardScreen />)
    await act(async () => {
      fireEvent.press(await screen.findByTestId('dashboard-birthdays-toggle'))
    })
    await act(async () => {
      screen.getByTestId('dashboard-birthdays-search').props.onChangeText('zzz')
    })

    expect(screen.getByTestId('dashboard-birthdays-no-result')).toBeTruthy()
  })

  it('ver menos volta aos cinco', async () => {
    mockStats.mockResolvedValue(
      stats({ todayBirthdays: [1, 2, 3, 4, 5, 6].map(birthday) }),
    )

    await renderWithProviders(<DashboardScreen />)
    await act(async () => {
      fireEvent.press(await screen.findByTestId('dashboard-birthdays-toggle'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('dashboard-birthdays-toggle'))
    })

    expect(screen.queryByTestId('dashboard-birthday-p6')).toBeNull()
    expect(screen.queryByTestId('dashboard-birthdays-search')).toBeNull()
  })
})
