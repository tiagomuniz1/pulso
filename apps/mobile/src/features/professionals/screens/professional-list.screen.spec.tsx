import { CouncilType, UserRole } from '@app/shared'
import { deleteProfessionalUseCase, listProfessionalsUseCase, type IProfessionalModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { ProfessionalListScreen } from './professional-list.screen'

jest.mock('@app/core/src/features/professionals/use-cases/list-professionals.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/delete-professional.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listProfessionalsUseCase as jest.MockedFunction<typeof listProfessionalsUseCase>
const mockDelete = deleteProfessionalUseCase as jest.MockedFunction<typeof deleteProfessionalUseCase>

const professional = (overrides: Partial<IProfessionalModel> = {}): IProfessionalModel =>
  ({
    id: 'prof-1',
    user: { id: 'u-2', fullName: 'Mauro Lima', email: 'mauro@pulso.test', isActive: true },
    registrations: [
      { id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
    ],
    specialties: [{ id: 'spec-1', name: 'Ginecologia', registryNumber: null }],
    bio: null,
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IProfessionalModel

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u-1', fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockList.mockResolvedValue([professional()])
  mockDelete.mockResolvedValue(undefined)
})

describe('ProfessionalListScreen', () => {
  it('mostra tipo, registro e especialidade', async () => {
    await renderWithProviders(<ProfessionalListScreen />)

    const card = await screen.findByTestId('professional-card-prof-1')
    expect(card).toHaveTextContent(/Mauro Lima/)
    expect(card).toHaveTextContent(/Medicina/)
    expect(card).toHaveTextContent(/CRM 12345\/SP/)
    expect(card).toHaveTextContent(/Ginecologia/)
  })

  // Quem tem mais de um conselho mostra o principal e um "+1" — o cartão não
  // tem largura para os dois, e esconder o segundo sem dizer seria pior.
  it('resume os registros e as especialidades extras', async () => {
    mockList.mockResolvedValue([
      professional({
        registrations: [
          { id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
          { id: 'reg-2', councilType: CouncilType.CREFITO, number: '999', state: 'SP', isPrimary: false },
        ] as never,
        specialties: [
          { id: 'spec-1', name: 'Ginecologia', registryNumber: null },
          { id: 'spec-2', name: 'Obstetrícia', registryNumber: null },
        ] as never,
      }),
    ])

    await renderWithProviders(<ProfessionalListScreen />)

    const card = await screen.findByTestId('professional-card-prof-1')
    expect(card).toHaveTextContent(/CRM 12345\/SP \+1/)
    expect(card).toHaveTextContent(/Ginecologia \+1/)
  })

  it('sem especialidade, mostra um traço', async () => {
    mockList.mockResolvedValue([professional({ specialties: [] })])

    await renderWithProviders(<ProfessionalListScreen />)

    expect(await screen.findByTestId('professional-card-prof-1')).toHaveTextContent(/—/)
  })

  it('conta no singular', async () => {
    await renderWithProviders(<ProfessionalListScreen />)
    expect(await screen.findByTestId('professional-list-header-subtitle')).toHaveTextContent(
      /^1 profissional cadastrado$/,
    )
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<ProfessionalListScreen />)
    expect(screen.getByTestId('professional-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<ProfessionalListScreen />)
    fireEvent.press(await screen.findByTestId('professional-list-error-retry'))

    expect(await screen.findByTestId('professional-card-prof-1')).toBeTruthy()
  })

  it('diz quando não há profissional', async () => {
    mockList.mockResolvedValue([])
    await renderWithProviders(<ProfessionalListScreen />)
    expect(await screen.findByTestId('professional-list-empty')).toHaveTextContent(
      /Nenhum profissional encontrado\.$/,
    )
  })

  it('busca no servidor depois que a digitação para', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<ProfessionalListScreen />)
      mockList.mockClear()

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('professional-list-search'), 'mauro')
      })
      expect(mockList).not.toHaveBeenCalled()

      await act(async () => {
        jest.advanceTimersByTime(300)
      })
      expect(mockList).toHaveBeenCalledWith({ search: 'mauro' })
    } finally {
      jest.useRealTimers()
    }
  })

  it('a busca sem resultado diz que foi a busca', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<ProfessionalListScreen />)
      mockList.mockResolvedValue([])

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('professional-list-search'), 'zzz')
        jest.advanceTimersByTime(300)
      })

      await waitFor(() =>
        expect(screen.getByTestId('professional-list-empty')).toHaveTextContent(
          /para a busca realizada/,
        ),
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it('exclui pedindo confirmação e avisa', async () => {
    await renderWithProviders(<ProfessionalListScreen />)

    fireEvent.press(await screen.findByTestId('professional-card-delete-prof-1'))
    fireEvent.press(await screen.findByTestId('professional-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('prof-1'))
    expect(await screen.findByTestId('professional-list-success')).toHaveTextContent(
      /Mauro Lima excluído com sucesso/,
    )
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<ProfessionalListScreen />)

    fireEvent.press(await screen.findByTestId('professional-card-delete-prof-1'))
    fireEvent.press(await screen.findByTestId('professional-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('professional-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<ProfessionalListScreen />)
    fireEvent.press(await screen.findByTestId('professional-card-delete-prof-1'))
    fireEvent.press(await screen.findByTestId('professional-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('professional-delete-dialog-message')).toBeNull(),
    )
    expect(screen.queryByTestId('professional-list-success')).toBeNull()
  })

  it.each([
    ['abre o detalhe', 'professional-card-open-prof-1', '/(app)/professionals/prof-1'],
    ['abre a edição', 'professional-card-edit-prof-1', '/(app)/professionals/prof-1/edit'],
    ['abre o cadastro', 'professional-list-new', '/(app)/professionals/new'],
  ])('%s', async (_caso, testID, route) => {
    await renderWithProviders(<ProfessionalListScreen />)

    fireEvent.press(await screen.findByTestId(testID))

    expect(mockPush).toHaveBeenCalledWith(route)
  })

  /**
   * "Consultas" abre a agenda **daquele** profissional, como o `?doctor=` da
   * web. Sem o parâmetro cairia na agenda de outra pessoa, e o toque não
   * teria sentido nenhum.
   */
  it('consultas abre a agenda do profissional', async () => {
    await renderWithProviders(<ProfessionalListScreen />)

    fireEvent.press(await screen.findByTestId('professional-card-appointments-prof-1'))

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(app)',
      params: { professionalId: 'prof-1' },
    })
  })

  /**
   * O PROFESSIONAL recebe só a própria ficha — recorte do servidor — e a
   * recepção lê a lista inteira. Nenhum dos dois gere: criar, editar e
   * excluir são do ADMIN.
   */
  it.each([
    ['o profissional', UserRole.PROFESSIONAL],
    ['a recepção', UserRole.USER],
  ])('%s lê, mas não gere', async (_caso, role) => {
    asRole(role)

    await renderWithProviders(<ProfessionalListScreen />)

    expect(await screen.findByTestId('professional-card-prof-1')).toBeTruthy()
    expect(screen.queryByTestId('professional-list-new')).toBeNull()
    expect(screen.queryByTestId('professional-card-edit-prof-1')).toBeNull()
    expect(screen.queryByTestId('professional-card-delete-prof-1')).toBeNull()
  })
})
