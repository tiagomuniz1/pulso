import { VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import {
  getMyProfessionalUseCase,
  getPatientVaccineStatusUseCase,
  recordVaccineDecisionUseCase,
  type IPatientVaccineStatusItem,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { VaccineStatusPanel } from './vaccine-status-panel'

jest.mock('@app/core/src/features/vaccine-schedules/use-cases/get-patient-vaccine-status.use-case')
jest.mock('@app/core/src/features/vaccine-schedules/use-cases/record-vaccine-decision.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')

const mockStatus = getPatientVaccineStatusUseCase as jest.MockedFunction<
  typeof getPatientVaccineStatusUseCase
>
const mockRecord = recordVaccineDecisionUseCase as jest.MockedFunction<
  typeof recordVaccineDecisionUseCase
>
const mockMine = getMyProfessionalUseCase as jest.MockedFunction<typeof getMyProfessionalUseCase>

const item = (overrides: Partial<IPatientVaccineStatusItem> = {}): IPatientVaccineStatusItem => ({
  vaccineId: 'v1',
  vaccineName: 'Tríplice viral',
  vaccineAbbreviation: 'SCR',
  status: VaccineScheduleStatus.PENDENTE,
  nextDoseLabel: '2ª dose',
  nextDoseDueFrom: '2026-04-12',
  dosesTaken: 1,
  dosesExpected: 2,
  decision: null,
  decisionReason: null,
  decidedByProfessionalName: null,
  ...overrides,
})

const status = (items: IPatientVaccineStatusItem[] = [item()], ageInMonths = 30) =>
  ({ patientId: 'pat-1', ageInMonths, items }) as never

beforeEach(() => {
  jest.clearAllMocks()
  mockStatus.mockResolvedValue(status())
  mockRecord.mockResolvedValue(undefined)
  mockMine.mockResolvedValue({ id: 'prof-1' } as never)
})

async function open() {
  return renderWithProviders(<VaccineStatusPanel patientId="pat-1" />)
}

describe('VaccineStatusPanel', () => {
  it('lista a vacina com situação e doses', async () => {
    await open()

    const row = await screen.findByTestId('vaccine-status-item-v1')
    expect(row).toHaveTextContent(/Tríplice viral/)
    expect(row).toHaveTextContent(/1 de 2 dose\(s\)/)
    expect(row).toHaveTextContent(/próxima: 2ª dose/)
    expect(row).toHaveTextContent(/a partir de 12\/04\/2026/)
  })

  /**
   * **O sistema informa, não prescreve.** A linguagem é de sugestão, e o
   * aviso está na tela, não só na modelagem.
   */
  it('diz na tela que a conduta é do profissional', async () => {
    await open()

    expect(screen.getByTestId('vaccine-status-disclaimer')).toHaveTextContent(
      /A conduta é do profissional/,
    )
  })

  it('o selo não usa linguagem de ordem', async () => {
    await open()

    expect(await screen.findByTestId('vaccine-status-badge-v1')).toHaveTextContent(
      'Pendente pelo calendário',
    )
  })

  it('resume a idade e quantas faltam', async () => {
    await open()

    expect(await screen.findByTestId('vaccine-status-summary')).toHaveTextContent(
      '2 anos · 1 vacina pendente pelo calendário',
    )
  })

  // A ordem da lista responde "o que preciso olhar agora".
  it('mostra primeiro o que saiu da janela', async () => {
    mockStatus.mockResolvedValue(
      status([
        item({ vaccineId: 'v1', vaccineName: 'Em dia', status: VaccineScheduleStatus.EM_DIA }),
        item({ vaccineId: 'v2', vaccineName: 'Fora da janela', status: VaccineScheduleStatus.ATRASADA }),
      ]),
    )

    await open()

    const rows = await screen.findAllByTestId(/^vaccine-status-item-/)
    expect(rows[0]).toHaveTextContent(/Fora da janela/)
  })

  it('mostra a conduta já registrada, com quem a registrou', async () => {
    mockStatus.mockResolvedValue(
      status([
        item({
          decision: VaccineDecision.DISPENSADA,
          decisionReason: 'Contraindicação',
          decidedByProfessionalName: 'Dra. Helena',
        }),
      ]),
    )

    await open()

    expect(await screen.findByTestId('vaccine-decision-reason-v1')).toHaveTextContent(
      'Dra. Helena: Contraindicação',
    )
  })

  it('trata carregando', async () => {
    mockStatus.mockReturnValue(new Promise(() => {}))

    await open()

    expect(screen.getByTestId('vaccine-status-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockStatus.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await open()

    fireEvent.press(await screen.findByTestId('vaccine-status-error-retry'))
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(2))
  })

  it('diz quando nenhuma vacina do calendário se aplica', async () => {
    mockStatus.mockResolvedValue(status([]))

    await open()

    expect(await screen.findByTestId('vaccine-status-empty')).toBeTruthy()
  })
})

/**
 * **Registrar conduta é ato clínico e depende da ficha**, como registrar
 * uma dose: cargo administrativo sozinho não decide sobre esquema
 * vacinal.
 */
describe('VaccineStatusPanel, a conduta', () => {
  it('quem não tem ficha não registra conduta', async () => {
    mockMine.mockResolvedValue(null as never)

    await open()
    await screen.findByTestId('vaccine-status-item-v1')

    await waitFor(() => expect(screen.queryByTestId('vaccine-decide-v1')).toBeNull())
  })

  // O que está em dia não tem o que decidir — o calendário não pede nada.
  it('não há conduta sobre o que está em dia', async () => {
    mockStatus.mockResolvedValue(status([item({ status: VaccineScheduleStatus.EM_DIA })]))

    await open()
    await screen.findByTestId('vaccine-status-item-v1')

    expect(screen.queryByTestId('vaccine-decide-v1')).toBeNull()
  })

  it('confirmar não exige motivo', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decision-select'))
    })
    await act(async () => {
      fireEvent.press(
        await screen.findByTestId(`vaccine-decision-select-option-${VaccineDecision.CONFIRMADA}`),
      )
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-confirm'))
    })

    await waitFor(() =>
      expect(mockRecord).toHaveBeenCalledWith({
        patientId: 'pat-1',
        vaccineId: 'v1',
        decision: VaccineDecision.CONFIRMADA,
      }),
    )
  })

  /**
   * Dispensar e adiar **exigem motivo**: sem ele, contraindicação e
   * esquema especial virariam alerta permanente e errado na tela da
   * paciente, sem ninguém saber por quê.
   */
  it('adiar sem motivo não registra', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decision-confirm'))
    })

    expect(screen.getByTestId('vaccine-decision-error')).toHaveTextContent(/Informe o motivo/)
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('motivo que é só espaço também não serve', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      screen.getByTestId('vaccine-decision-reason').props.onChangeText('   ')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-confirm'))
    })

    expect(screen.getByTestId('vaccine-decision-error')).toBeTruthy()
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('adiar com motivo registra', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      screen.getByTestId('vaccine-decision-reason').props.onChangeText('  Quadro febril  ')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-confirm'))
    })

    await waitFor(() =>
      expect(mockRecord).toHaveBeenCalledWith({
        patientId: 'pat-1',
        vaccineId: 'v1',
        decision: VaccineDecision.ADIADA,
        reason: 'Quadro febril',
      }),
    )
  })

  it('a folha some depois de registrar', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      screen.getByTestId('vaccine-decision-reason').props.onChangeText('Motivo')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-confirm'))
    })

    await waitFor(() => expect(screen.queryByTestId('vaccine-decision-reason')).toBeNull())
  })

  // Reabrir com a conduta anterior preenchida é o que permite corrigi-la
  // sem redigitar o motivo inteiro.
  it('abre preenchida com a conduta que já existia', async () => {
    mockStatus.mockResolvedValue(
      status([
        item({
          decision: VaccineDecision.DISPENSADA,
          decisionReason: 'Contraindicação',
          decidedByProfessionalName: 'Dra. Helena',
        }),
      ]),
    )

    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })

    expect(screen.getByTestId('vaccine-decision-reason').props.value).toBe('Contraindicação')
    expect(screen.getByTestId('vaccine-decision-select')).toHaveTextContent(/Não se aplica/)
  })

  it('explica quando o servidor recusa', async () => {
    mockRecord.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      screen.getByTestId('vaccine-decision-reason').props.onChangeText('Motivo')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-confirm'))
    })

    expect(await screen.findByTestId('vaccine-decision-error')).toHaveTextContent(
      /Não foi possível registrar/,
    )
  })

  it('fecha a folha pelo X', async () => {
    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('vaccine-decide-v1'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('vaccine-decision-dialog-close'))
    })

    expect(screen.queryByTestId('vaccine-decision-reason')).toBeNull()
    expect(mockRecord).not.toHaveBeenCalled()
  })
})
