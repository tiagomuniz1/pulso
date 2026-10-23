import { PatientGender } from '@app/shared'
import {
  createPatientUseCase,
  getPatientUseCase,
  patientsService,
  updatePatientUseCase,
  userService,
  type IPatientModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { EditPatientScreen, NewPatientScreen } from './patient-form.screen'

jest.mock('@app/core/src/features/patients/use-cases/create-patient.use-case')
jest.mock('@app/core/src/features/patients/use-cases/update-patient.use-case')
jest.mock('@app/core/src/features/patients/use-cases/get-patient.use-case')
jest.mock('@app/core/src/features/patients/services/patients.service')
jest.mock('@app/core/src/features/users/services/users.service')

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'pat-1' }),
}))

const mockCreate = createPatientUseCase as jest.MockedFunction<typeof createPatientUseCase>
const mockUpdate = updatePatientUseCase as jest.MockedFunction<typeof updatePatientUseCase>
const mockGet = getPatientUseCase as jest.MockedFunction<typeof getPatientUseCase>

const patient: IPatientModel = {
  id: 'pat-1',
  fullName: 'Ana Paula Souza',
  email: 'ana@pulso.test',
  phoneNumber: '11999998888',
  birthDate: new Date(1990, 4, 15),
  documentNumber: '92115862811',
  gender: PatientGender.FEMALE,
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  address: null,
  createdAt: new Date(2026, 9, 15),
  updatedAt: new Date(2026, 9, 15),
} as IPatientModel

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue(patient)
  mockCreate.mockResolvedValue(patient)
  mockUpdate.mockResolvedValue(patient)
  ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })
  ;(userService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })
})

async function preencher() {
  await act(async () => {
    screen.getByTestId('patient-form-fullname').props.onChangeText('Ana Paula Souza')
    screen.getByTestId('patient-form-email').props.onChangeText('ana@pulso.test')
    screen.getByTestId('patient-form-phone').props.onChangeText('11999998888')
    screen.getByTestId('patient-form-birthdate').props.onChangeText('15051990')
    screen.getByTestId('patient-form-document').props.onChangeText('92115862811')
  })
  await act(async () => {
    fireEvent.press(screen.getByTestId('patient-form-gender-female'))
  })
}

describe('NewPatientScreen', () => {
  it('cria e volta para de onde veio', async () => {
    await renderWithProviders(<NewPatientScreen />)
    await preencher()

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(mockBack).toHaveBeenCalled()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<NewPatientScreen />)
    await preencher()
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(await screen.findByTestId('patient-form-error')).toHaveTextContent(/Já existe/)
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<NewPatientScreen />)

    fireEvent.press(screen.getByTestId('patient-new-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})

describe('EditPatientScreen', () => {
  it('abre preenchido e salva', async () => {
    await renderWithProviders(<EditPatientScreen />)

    await screen.findByTestId('patient-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('pat-1', expect.anything()))
    expect(mockBack).toHaveBeenCalled()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<EditPatientScreen />)

    expect(screen.getByTestId('patient-edit-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<EditPatientScreen />)
    fireEvent.press(await screen.findByTestId('patient-edit-error-retry'))

    expect(await screen.findByTestId('patient-form')).toBeTruthy()
  })

  it('mostra o erro do servidor sem sair da tela', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<EditPatientScreen />)
    await screen.findByTestId('patient-form')
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(await screen.findByTestId('patient-form-error')).toHaveTextContent(
      /Não foi possível salvar/,
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<EditPatientScreen />)

    fireEvent.press(screen.getByTestId('patient-edit-screen-back'))

    expect(mockBack).toHaveBeenCalled()
  })
})
