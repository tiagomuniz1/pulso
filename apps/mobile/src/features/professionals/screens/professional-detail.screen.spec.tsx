import { CouncilType, UserRole } from '@app/shared'
import {
  deleteProfessionalUseCase,
  getProfessionalUseCase,
  type IProfessionalModel,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { ProfessionalDetailScreen } from './professional-detail.screen'

jest.mock('@app/core/src/features/professionals/use-cases/get-professional.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/delete-professional.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'prof-1' }),
}))

const mockGet = getProfessionalUseCase as jest.MockedFunction<typeof getProfessionalUseCase>
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
  mockGet.mockResolvedValue(professional())
  mockDelete.mockResolvedValue(undefined)
})

describe('ProfessionalDetailScreen', () => {
  it('mostra nome, registro e especialidade', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-name')).toHaveTextContent(/Mauro Lima/)
    expect(screen.getByTestId('professional-details-registration-reg-1')).toHaveTextContent(
      /CRM 12345\/SP · principal/,
    )
    expect(screen.getByTestId('professional-details-specialty-spec-1')).toHaveTextContent(
      /^Ginecologia$/,
    )
  })

  // O RQE é o que distingue o ginecologista com título do que só exerce.
  it('mostra o RQE quando existe', async () => {
    mockGet.mockResolvedValue(
      professional({
        specialties: [{ id: 'spec-1', name: 'Ginecologia', registryNumber: '54321' }] as never,
      }),
    )

    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-specialty-spec-1')).toHaveTextContent(
      /Ginecologia — RQE 54321/,
    )
  })

  // O secundário não leva a marca — é ela que diz qual registro assina.
  it('o registro secundário não aparece como principal', async () => {
    mockGet.mockResolvedValue(
      professional({
        registrations: [
          { id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
          { id: 'reg-2', councilType: CouncilType.CREFITO, number: '999', state: 'SP', isPrimary: false },
        ] as never,
      }),
    )

    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-registration-reg-2')).toHaveTextContent(
      /^CREFITO 999\/SP$/,
    )
  })

  it('diz quando não há especialidade', async () => {
    mockGet.mockResolvedValue(professional({ specialties: [] }))

    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-no-specialties')).toBeTruthy()
  })

  it('a bio só aparece quando existe', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    await screen.findByTestId('professional-details-name')
    expect(screen.queryByTestId('professional-details-bio')).toBeNull()
  })

  it('mostra a bio quando existe', async () => {
    mockGet.mockResolvedValue(professional({ bio: 'Atende gestantes desde 2008.' }))

    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-bio')).toHaveTextContent(
      /Atende gestantes desde 2008/,
    )
  })

  it('abre a edição', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    fireEvent.press(await screen.findByTestId('professional-details-edit'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/professionals/prof-1/edit')
  })

  it('exclui e volta', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    fireEvent.press(await screen.findByTestId('professional-details-delete'))
    fireEvent.press(await screen.findByTestId('professional-detail-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('prof-1'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<ProfessionalDetailScreen />)
    fireEvent.press(await screen.findByTestId('professional-details-delete'))
    fireEvent.press(await screen.findByTestId('professional-detail-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('professional-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    fireEvent.press(await screen.findByTestId('professional-details-delete'))
    fireEvent.press(await screen.findByTestId('professional-detail-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('professional-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  /**
   * O profissional vê a própria ficha e a recepção vê as de todos — mas
   * editar e excluir são do ADMIN, inclusive para o profissional sobre si
   * mesmo: excluir a própria ficha apaga o usuário junto.
   */
  it.each([
    ['o profissional', UserRole.PROFESSIONAL],
    ['a recepção', UserRole.USER],
  ])('%s lê, mas não gere', async (_caso, role) => {
    asRole(role)

    await renderWithProviders(<ProfessionalDetailScreen />)

    expect(await screen.findByTestId('professional-details-name')).toBeTruthy()
    expect(screen.queryByTestId('professional-details-edit')).toBeNull()
    expect(screen.queryByTestId('professional-details-delete')).toBeNull()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<ProfessionalDetailScreen />)

    fireEvent.press(await screen.findByTestId('professional-detail-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<ProfessionalDetailScreen />)
    expect(screen.getByTestId('professional-detail-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<ProfessionalDetailScreen />)
    fireEvent.press(await screen.findByTestId('professional-detail-error-retry'))

    expect(await screen.findByTestId('professional-details-name')).toBeTruthy()
  })
})
