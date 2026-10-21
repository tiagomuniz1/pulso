import { PatientGender, UserRole } from '@app/shared'
import { deletePatientUseCase, listPatientsUseCase, type IPatientModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { PatientListScreen } from './patient-list.screen'

jest.mock('@app/core/src/features/patients/use-cases/list-patients.use-case')
jest.mock('@app/core/src/features/patients/use-cases/delete-patient.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listPatientsUseCase as jest.MockedFunction<typeof listPatientsUseCase>
const mockDelete = deletePatientUseCase as jest.MockedFunction<typeof deletePatientUseCase>

const patient = (overrides: Partial<IPatientModel> = {}): IPatientModel =>
  ({
    id: 'pat-1',
    fullName: 'Ana Paula Souza',
    email: 'ana@pulso.test',
    phoneNumber: '11999998888',
    birthDate: new Date(1990, 4, 15),
    documentNumber: '12345678901',
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
  mockList.mockResolvedValue([patient()])
  mockDelete.mockResolvedValue(undefined)
})

describe('PatientListScreen', () => {
  it('mostra o paciente com telefone, nascimento e gênero', async () => {
    await renderWithProviders(<PatientListScreen />)

    const card = await screen.findByTestId('patient-card-pat-1')
    expect(card).toHaveTextContent(/Ana Paula Souza/)
    expect(card).toHaveTextContent(/ana@pulso\.test/)
    expect(card).toHaveTextContent(/\(11\) 99999-8888/)
    expect(card).toHaveTextContent(/15\/05\/1990/)
    expect(card).toHaveTextContent(/Feminino/)
  })

  it('conta os pacientes cadastrados', async () => {
    mockList.mockResolvedValue([patient(), patient({ id: 'pat-2' })])

    await renderWithProviders(<PatientListScreen />)

    expect(await screen.findByTestId('patient-list-header-subtitle')).toHaveTextContent(
      /^2 pacientes cadastrados$/,
    )
  })

  // "1 pacientes cadastrados" é o tipo de erro que ninguém reporta e todo
  // mundo nota. A web trata o singular, e aqui também.
  it('usa o singular quando há um só', async () => {
    await renderWithProviders(<PatientListScreen />)

    expect(await screen.findByTestId('patient-list-header-subtitle')).toHaveTextContent(
      /^1 paciente cadastrado$/,
    )
  })

  it('mostra o carregando enquanto a lista não volta', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<PatientListScreen />)

    expect(screen.getByTestId('patient-list-loading')).toBeTruthy()
  })

  it('mostra o erro quando a lista falha', async () => {
    mockList.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientListScreen />)

    expect(await screen.findByTestId('patient-list-error')).toBeTruthy()
  })

  it('diz quando não há paciente nenhum', async () => {
    mockList.mockResolvedValue([])

    await renderWithProviders(<PatientListScreen />)

    expect(await screen.findByTestId('patient-list-empty')).toHaveTextContent(
      /Nenhum paciente encontrado\.$/,
    )
  })

  it('tenta de novo depois do erro', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientListScreen />)
    fireEvent.press(await screen.findByTestId('patient-list-error-retry'))

    expect(await screen.findByTestId('patient-card-pat-1')).toBeTruthy()
  })

  /**
   * A busca vai ao servidor, e com atraso.
   *
   * Sem o atraso cada letra é uma requisição, e numa rede de celular as
   * respostas voltam fora de ordem — a lista pisca com o resultado de uma
   * busca anterior. O teste prova as duas coisas: que nada sai antes do
   * tempo e que o que sai é o termo inteiro.
   */
  it('busca no servidor depois que a digitação para', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<PatientListScreen />)
      mockList.mockClear()

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('patient-list-search'), 'ana')
      })
      expect(mockList).not.toHaveBeenCalled()

      await act(async () => {
        jest.advanceTimersByTime(300)
      })
      expect(mockList).toHaveBeenCalledWith({ search: 'ana' })
    } finally {
      jest.useRealTimers()
    }
  })

  it('a busca sem resultado diz que foi a busca', async () => {
    jest.useFakeTimers()
    try {
      await renderWithProviders(<PatientListScreen />)
      mockList.mockResolvedValue([])

      await act(async () => {
        fireEvent.changeText(screen.getByTestId('patient-list-search'), 'zzz')
        jest.advanceTimersByTime(300)
      })

      await waitFor(() =>
        expect(screen.getByTestId('patient-list-empty')).toHaveTextContent(/para a busca realizada/),
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it('exclui pedindo confirmação e avisa depois', async () => {
    await renderWithProviders(<PatientListScreen />)

    fireEvent.press(await screen.findByTestId('patient-card-delete-pat-1'))
    expect(await screen.findByTestId('patient-delete-dialog-message')).toHaveTextContent(
      /Ana Paula Souza/,
    )

    fireEvent.press(screen.getByTestId('patient-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('pat-1'))
    expect(await screen.findByTestId('patient-list-success')).toHaveTextContent(
      /Ana Paula Souza excluído com sucesso/,
    )
  })

  it('desistir da exclusão não exclui', async () => {
    await renderWithProviders(<PatientListScreen />)

    fireEvent.press(await screen.findByTestId('patient-card-delete-pat-1'))
    fireEvent.press(await screen.findByTestId('patient-delete-dialog-cancel'))

    await waitFor(() => expect(screen.queryByTestId('patient-delete-dialog-message')).toBeNull())
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<PatientListScreen />)
    fireEvent.press(await screen.findByTestId('patient-card-delete-pat-1'))
    fireEvent.press(await screen.findByTestId('patient-delete-dialog-confirm'))

    await waitFor(() => expect(screen.queryByTestId('patient-delete-dialog-message')).toBeNull())
    expect(screen.queryByTestId('patient-list-success')).toBeNull()
  })

  it.each([
    ['abre o detalhe', 'patient-card-open-pat-1', '/(app)/patients/pat-1'],
    ['abre a edição', 'patient-card-edit-pat-1', '/(app)/patients/pat-1/edit'],
    ['abre as consultas', 'patient-card-appointments-pat-1', '/(app)/patients/pat-1/appointments'],
    ['abre o cadastro', 'patient-list-new', '/(app)/patients/new'],
  ])('%s', async (_caso, testID, route) => {
    await renderWithProviders(<PatientListScreen />)

    fireEvent.press(await screen.findByTestId(testID))

    expect(mockPush).toHaveBeenCalledWith(route)
  })

  /**
   * A recepção lê a lista para achar a paciente, e é só isso que ela faz
   * ali: criar, editar e excluir são do ADMIN. Oferecer-lhe os botões faria
   * cada toque terminar em `403`.
   */
  it('a recepção lê, mas não cria, edita nem exclui', async () => {
    asRole(UserRole.USER)

    await renderWithProviders(<PatientListScreen />)

    expect(await screen.findByTestId('patient-card-pat-1')).toBeTruthy()
    expect(screen.getByTestId('patient-card-appointments-pat-1')).toBeTruthy()
    expect(screen.queryByTestId('patient-list-new')).toBeNull()
    expect(screen.queryByTestId('patient-card-edit-pat-1')).toBeNull()
    expect(screen.queryByTestId('patient-card-delete-pat-1')).toBeNull()
  })
})
