import { CouncilType, UserRole } from '@app/shared'
import {
  createProfessionalUseCase,
  getProfessionalUseCase,
  listClinicSpecialtiesUseCase,
  updateProfessionalUseCase,
  userService,
  type IProfessionalModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { EditProfessionalScreen, NewProfessionalScreen } from './professional-form.screen'

jest.mock('@app/core/src/features/professionals/use-cases/create-professional.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/update-professional.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-professional.use-case')
jest.mock('@app/core/src/features/clinic-specialties/use-cases/list-clinic-specialties.use-case')
jest.mock('@app/core/src/features/users/services/users.service')

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'prof-1' }),
}))

const mockCreate = createProfessionalUseCase as jest.MockedFunction<typeof createProfessionalUseCase>
const mockUpdate = updateProfessionalUseCase as jest.MockedFunction<typeof updateProfessionalUseCase>
const mockGet = getProfessionalUseCase as jest.MockedFunction<typeof getProfessionalUseCase>

const professional: IProfessionalModel = {
  id: 'prof-1',
  user: { id: 'u-2', fullName: 'Mauro Lima', email: 'mauro@pulso.test', isActive: true },
  registrations: [
    { id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
  ],
  specialties: [],
  bio: null,
  createdAt: new Date(2026, 9, 20),
  updatedAt: new Date(2026, 9, 20),
} as IProfessionalModel

beforeEach(() => {
  jest.clearAllMocks()
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'u-1',
      fullName: 'Dra. Ana',
      email: 'a@b.c',
      role: UserRole.ADMIN,
      clinicId: 'c1',
    } as never,
  })
  mockGet.mockResolvedValue(professional)
  mockCreate.mockResolvedValue(professional)
  mockUpdate.mockResolvedValue(professional)
  ;(listClinicSpecialtiesUseCase as jest.Mock).mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  })
  ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })
})

describe('NewProfessionalScreen', () => {
  it('cria e volta', async () => {
    await renderWithProviders(<NewProfessionalScreen />)
    await act(async () => {
      screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
      screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      screen.getByTestId('professional-form-registration-number-0').props.onChangeText('12345')
      screen.getByTestId('professional-form-registration-state-0').props.onChangeText('SP')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(mockBack).toHaveBeenCalled()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<NewProfessionalScreen />)
    await act(async () => {
      screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
      screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      screen.getByTestId('professional-form-registration-number-0').props.onChangeText('12345')
      screen.getByTestId('professional-form-registration-state-0').props.onChangeText('SP')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    expect(await screen.findByTestId('professional-form-error')).toBeTruthy()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<NewProfessionalScreen />)

    fireEvent.press(screen.getByTestId('professional-new-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})

describe('EditProfessionalScreen', () => {
  it('abre preenchido e salva', async () => {
    await renderWithProviders(<EditProfessionalScreen />)

    await screen.findByTestId('professional-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('prof-1', expect.anything()))
    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<EditProfessionalScreen />)
    expect(screen.getByTestId('professional-edit-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<EditProfessionalScreen />)
    fireEvent.press(await screen.findByTestId('professional-edit-error-retry'))

    expect(await screen.findByTestId('professional-form')).toBeTruthy()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<EditProfessionalScreen />)
    await screen.findByTestId('professional-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    expect(await screen.findByTestId('professional-form-error')).toHaveTextContent(
      /Não foi possível salvar/,
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<EditProfessionalScreen />)

    fireEvent.press(screen.getByTestId('professional-edit-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})
