import { KinshipType, PatientGender, UserRole } from '@app/shared'
import {
  deletePatientUseCase,
  getPatientUseCase,
  listPatientMedicalHistoryUseCase,
  listPatientPhotosUseCase,
  type IPatientModel,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { PatientDetailScreen } from './patient-detail.screen'

jest.mock('@app/core/src/features/patients/use-cases/get-patient.use-case')
jest.mock('@app/core/src/features/patients/use-cases/delete-patient.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/list-patient-medical-history.use-case')
jest.mock('@app/core/src/features/consultation-photos/use-cases/list-patient-photos.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ id: 'pat-1' }),
}))

const mockGet = getPatientUseCase as jest.MockedFunction<typeof getPatientUseCase>
const mockDelete = deletePatientUseCase as jest.MockedFunction<typeof deletePatientUseCase>
const mockHistory = listPatientMedicalHistoryUseCase as jest.MockedFunction<
  typeof listPatientMedicalHistoryUseCase
>
const mockPhotos = listPatientPhotosUseCase as jest.MockedFunction<typeof listPatientPhotosUseCase>

const patient = (overrides: Partial<IPatientModel> = {}): IPatientModel =>
  ({
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
    ...overrides,
  }) as IPatientModel

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dra. Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockGet.mockResolvedValue(patient())
  mockDelete.mockResolvedValue(undefined)
  mockHistory.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 } as never)
  mockPhotos.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 } as never)
})

describe('PatientDetailScreen', () => {
  it('mostra os dados do paciente', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-details-name')).toHaveTextContent(/Ana Paula Souza/)
    expect(screen.getByTestId('patient-details-phone')).toHaveTextContent(/\(11\) 99999-8888/)
    expect(screen.getByTestId('patient-details-birthdate')).toHaveTextContent(/15 de maio de 1990/)
    expect(screen.getByTestId('patient-details-document')).toHaveTextContent(/921\.158\.628-11/)
    expect(screen.getByTestId('patient-details-gender')).toHaveTextContent(/Feminino/)
  })

  /**
   * Dependente pode não ter CPF — recém-nascido e menor sem documento
   * emitido são o motivo de o campo ser opcional. "Não informado" é melhor
   * do que uma linha em branco, que parece falha de carregamento.
   */
  it('diz quando não há CPF', async () => {
    mockGet.mockResolvedValue(patient({ documentNumber: null }))

    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-details-document')).toHaveTextContent(
      /^Não informado$/,
    )
  })

  it('mostra o endereço quando existe', async () => {
    mockGet.mockResolvedValue(
      patient({
        address: {
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 42',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
        } as never,
      }),
    )

    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-details-address-street')).toHaveTextContent(
      /Rua das Flores, 123/,
    )
    expect(screen.getByTestId('patient-details-address-complement')).toHaveTextContent(/Apto 42/)
    expect(screen.getByTestId('patient-details-address-city')).toHaveTextContent(/São Paulo — SP/)
  })

  it('sem complemento, não desenha a linha', async () => {
    mockGet.mockResolvedValue(
      patient({
        address: {
          street: 'Rua das Flores',
          number: '123',
          complement: null,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
        } as never,
      }),
    )

    await renderWithProviders(<PatientDetailScreen />)

    await screen.findByTestId('patient-details-address')
    expect(screen.queryByTestId('patient-details-address-complement')).toBeNull()
  })

  it('sem endereço, diz que não está cadastrado', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-details-no-address')).toBeTruthy()
  })

  /**
   * Titular e dependente abrem a ficha um do outro, como os links da web.
   *
   * Dois casos e não um: dois `fireEvent.press` seguidos no mesmo teste
   * produzem chamadas de `act()` sobrepostas, e isso corrompe **todos** os
   * testes seguintes do arquivo — já custou uma manhã aqui.
   */
  const comVinculos = () =>
    mockGet.mockResolvedValue(
      patient({
        kinshipType: KinshipType.MAE,
        responsiblePatientId: 'pat-9',
        responsiblePatient: { id: 'pat-9', fullName: 'Maria Souza', documentNumber: null },
        dependents: [{ id: 'pat-7', fullName: 'João Souza', kinshipType: KinshipType.FILHO }],
      }),
    )

  it('abre a ficha do titular', async () => {
    comVinculos()

    await renderWithProviders(<PatientDetailScreen />)
    fireEvent.press(await screen.findByTestId('patient-details-responsible'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/patients/pat-9')
  })

  it('abre a ficha do dependente', async () => {
    comVinculos()

    await renderWithProviders(<PatientDetailScreen />)
    fireEvent.press(await screen.findByTestId('patient-details-dependent-pat-7'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/patients/pat-7')
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<PatientDetailScreen />)

    expect(screen.getByTestId('patient-detail-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValueOnce({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientDetailScreen />)
    fireEvent.press(await screen.findByTestId('patient-detail-error-retry'))

    expect(await screen.findByTestId('patient-details-name')).toBeTruthy()
  })

  it('volta pelo botão', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    fireEvent.press(await screen.findByTestId('patient-detail-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  it('abre a edição', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    fireEvent.press(await screen.findByTestId('patient-details-edit'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/patients/pat-1/edit')
  })

  it('exclui e volta para a lista', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    fireEvent.press(await screen.findByTestId('patient-details-delete'))
    fireEvent.press(await screen.findByTestId('patient-detail-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('pat-1'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha, sem sair da tela', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientDetailScreen />)
    fireEvent.press(await screen.findByTestId('patient-details-delete'))
    fireEvent.press(await screen.findByTestId('patient-detail-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('patient-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('desistir da exclusão não exclui', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    fireEvent.press(await screen.findByTestId('patient-details-delete'))
    fireEvent.press(await screen.findByTestId('patient-detail-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('patient-detail-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  /**
   * Prontuário e foto são dado clínico, e a recepção não os lê — é a mesma
   * regra da web (`canSeeMedicalHistory`). Ela continua vendo os dados de
   * contato, que é o que o trabalho dela pede.
   */
  it('a recepção vê os dados, mas não o histórico nem as fotos', async () => {
    asRole(UserRole.USER)

    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-details-name')).toBeTruthy()
    expect(screen.queryByTestId('patient-history-title')).toBeNull()
    expect(screen.queryByTestId('patient-photos-title')).toBeNull()
    expect(screen.queryByTestId('patient-details-edit')).toBeNull()
    expect(screen.queryByTestId('patient-details-delete')).toBeNull()
  })

  it('o profissional vê o histórico e as fotos, mas não edita', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<PatientDetailScreen />)

    expect(await screen.findByTestId('patient-history-title')).toBeTruthy()
    expect(screen.getByTestId('patient-photos-title')).toBeTruthy()
    expect(screen.queryByTestId('patient-details-edit')).toBeNull()
  })

  /**
   * O histórico aqui é o do paciente inteiro, não o da especialidade da
   * consulta: na ficha a pergunta é "o que já aconteceu com esta pessoa".
   * Mandar `specialtyId` recortaria por uma consulta que não existe neste
   * contexto.
   */
  it('pede o histórico sem recorte de especialidade', async () => {
    await renderWithProviders(<PatientDetailScreen />)

    await waitFor(() => expect(mockHistory).toHaveBeenCalled())
    expect(mockHistory).toHaveBeenCalledWith('pat-1', { limit: 50 })
  })
})
