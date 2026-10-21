import {
  createVaccinationUseCase,
  listVaccinationsUseCase,
  listVaccinesUseCase,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { VaccinationHistory } from './vaccination-history'

jest.mock('@app/core/src/features/vaccines/use-cases/list-vaccines.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/list-vaccinations.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/create-vaccination.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/delete-vaccination.use-case')

const mockVaccines = listVaccinesUseCase as jest.MockedFunction<typeof listVaccinesUseCase>
const mockDoses = listVaccinationsUseCase as jest.MockedFunction<typeof listVaccinationsUseCase>
const mockCreate = createVaccinationUseCase as jest.MockedFunction<typeof createVaccinationUseCase>

beforeEach(() => {
  jest.clearAllMocks()
  mockVaccines.mockResolvedValue({
    data: [
      {
        id: 'v1',
        name: 'Tríplice viral',
        abbreviation: 'SCR',
        preventedDiseases: [],
        isActive: true,
        createdAt: new Date(),
      },
    ],
    total: 1,
    page: 1,
    limit: 200,
  } as never)
  mockDoses.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 } as never)
  mockCreate.mockResolvedValue({ id: 'vac-1' } as never)
})

/**
 * A caderneta é **do paciente, não da consulta** — é a única entidade
 * clínica do sistema cujo `appointment_id` é opcional. Por isso o mesmo
 * componente serve a ficha do paciente e o atendimento.
 */
describe('VaccinationHistory, na ficha do paciente', () => {
  async function open(hasFicha = true) {
    return renderWithProviders(<VaccinationHistory patientId="pat-1" hasFicha={hasFicha} />)
  }

  it('pede a caderneta pelo paciente', async () => {
    await open()

    await waitFor(() =>
      expect(mockDoses).toHaveBeenCalledWith({ patientId: 'pat-1', limit: 100 }),
    )
  })

  /**
   * Fora de um atendimento a pergunta "aplicada nesta clínica" não tem
   * resposta possível: não há consulta a que amarrar a dose.
   */
  it('não pergunta se foi aplicada nesta clínica', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccination-new'))
    })

    expect(screen.queryByTestId('vaccination-at-our-clinic')).toBeNull()
    expect(screen.getByTestId('vaccination-where')).toBeTruthy()
  })

  it('a dose transcrita vai sem consulta', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccination-new'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccination-vaccine'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
    })
    await act(async () => {
      screen.getByTestId('vaccination-where').props.onChangeText('UBS Centro')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccination-submit'))
    })

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    const payload = mockCreate.mock.calls[0][0]
    expect(payload).not.toHaveProperty('appointmentId')
    expect(payload).toMatchObject({ patientId: 'pat-1', appliedAtDescription: 'UBS Centro' })
  })

  // Registrar depende da ficha, não do cargo — é exercício, não escopo.
  it('quem não tem ficha só lê', async () => {
    mockDoses.mockResolvedValue({
      data: [{ id: 'vac-1', vaccineName: 'BCG', doseLabel: '', appliedAt: '2026-04-12', appliedAtDescription: null }],
      total: 1,
      page: 1,
      limit: 100,
    } as never)

    await open(false)

    await screen.findByTestId('vaccination-item-vac-1')
    expect(screen.queryByTestId('vaccination-new')).toBeNull()
    expect(screen.queryByTestId('vaccination-delete-vac-1')).toBeNull()
  })
})
