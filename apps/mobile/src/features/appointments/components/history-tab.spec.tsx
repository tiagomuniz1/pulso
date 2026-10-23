import { MedicalRecordFieldType } from '@app/shared'
import { listPatientMedicalHistoryUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { HistoryTab } from './history-tab'

jest.mock('@app/core/src/features/medical-records/use-cases/list-patient-medical-history.use-case')

const mockHistory = listPatientMedicalHistoryUseCase as jest.MockedFunction<
  typeof listPatientMedicalHistoryUseCase
>

const record = (overrides = {}) => ({
  id: 'rec-1',
  appointmentDate: '2026-02-10',
  appointmentStartTime: '09:00:00',
  professionalName: 'Dra. Ana',
  specialtyName: 'Ginecologia',
  schema: [
    {
      key: 'queixa',
      label: 'Queixa principal',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 1,
      options: null,
      placeholder: null,
      helpText: null,
      sectionKey: null,
    },
  ],
  data: { queixa: 'Cefaleia' },
  notes: null,
  ...overrides,
})

const page = (data: unknown[], total = data.length) =>
  ({ data, total, page: 1, limit: 50 }) as never

beforeEach(() => {
  jest.clearAllMocks()
  mockHistory.mockResolvedValue(page([record()]))
})

function render() {
  return renderWithProviders(
    <HistoryTab patientId="pat-1" specialtyId="spec-1" appointmentId="appt-1" />,
  )
}

describe('HistoryTab', () => {
  it('lista o atendimento anterior com data e quem atendeu', async () => {
    await render()

    const item = await screen.findByTestId('appointment-history-item-rec-1')
    expect(item).toHaveTextContent(/10\/02\/2026 às 09:00/)
    expect(screen.getByTestId('appointment-history-professional-rec-1')).toHaveTextContent(
      /Dra\. Ana • Ginecologia/,
    )
  })

  // O conteúdo do prontuário só aparece ao toque: a lista precisa caber na
  // tela antes de qualquer coisa.
  it('abre e fecha o conteúdo do registro', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('appointment-history-toggle-rec-1'))

    const detail = await screen.findByTestId('appointment-history-detail-rec-1')
    expect(detail).toHaveTextContent(/QUEIXA PRINCIPAL/)
    expect(detail).toHaveTextContent(/Cefaleia/)

    fireEvent.press(screen.getByTestId('appointment-history-toggle-rec-1'))

    await waitFor(() =>
      expect(screen.queryByTestId('appointment-history-detail-rec-1')).toBeNull(),
    )
  })

  it('mostra as observações do registro aberto', async () => {
    mockHistory.mockResolvedValue(page([record({ notes: 'Retorno em 30 dias' })]))

    await render()
    fireEvent.press(await screen.findByTestId('appointment-history-toggle-rec-1'))

    expect(await screen.findByTestId('appointment-history-detail-rec-1')).toHaveTextContent(
      /Retorno em 30 dias/,
    )
  })

  it('a busca filtra pelo conteúdo dos campos', async () => {
    mockHistory.mockResolvedValue(
      page([record(), record({ id: 'rec-2', data: { queixa: 'Dor lombar' } })]),
    )

    await render()
    fireEvent.changeText(await screen.findByTestId('appointment-history-search'), 'lombar')

    await waitFor(() =>
      expect(screen.queryByTestId('appointment-history-item-rec-1')).toBeNull(),
    )
    expect(screen.getByTestId('appointment-history-item-rec-2')).toBeTruthy()
  })

  it('a busca alcança o nome de quem atendeu', async () => {
    mockHistory.mockResolvedValue(
      page([record(), record({ id: 'rec-2', professionalName: 'Dr. Bruno' })]),
    )

    await render()
    fireEvent.changeText(await screen.findByTestId('appointment-history-search'), 'bruno')

    await waitFor(() =>
      expect(screen.queryByTestId('appointment-history-item-rec-1')).toBeNull(),
    )
    expect(screen.getByTestId('appointment-history-item-rec-2')).toBeTruthy()
  })

  it('diz quando a busca não acha nada', async () => {
    await render()
    fireEvent.changeText(await screen.findByTestId('appointment-history-search'), 'xyz')

    expect(await screen.findByTestId('appointment-history-no-results')).toHaveTextContent(/xyz/)
  })

  /**
   * Sem este aviso, a busca pareceria varrer tudo quando varre só a página
   * carregada — e o profissional concluiria que a paciente nunca teve o que
   * ele procura.
   */
  it('avisa que a lista veio truncada', async () => {
    mockHistory.mockResolvedValue(page([record()], 80))

    await render()

    expect(await screen.findByTestId('appointment-history-truncated')).toHaveTextContent(
      /Mostrando os 1 atendimentos mais recentes de 80/,
    )
  })

  it('não avisa quando a lista veio inteira', async () => {
    await render()
    await screen.findByTestId('appointment-history-item-rec-1')

    expect(screen.queryByTestId('appointment-history-truncated')).toBeNull()
  })

  it('sem histórico, não mostra nem busca nem aviso', async () => {
    mockHistory.mockResolvedValue(page([]))

    await render()

    expect(await screen.findByTestId('appointment-history-empty')).toBeTruthy()
    expect(screen.queryByTestId('appointment-history-search')).toBeNull()
  })

  it('atendimento sem especialidade não deixa separador solto, e ainda é buscável', async () => {
    mockHistory.mockResolvedValue(page([record({ specialtyName: null })]))

    await render()

    expect(
      await screen.findByTestId('appointment-history-professional-rec-1'),
    ).toHaveTextContent(/^Dra\. Ana$/)

    fireEvent.changeText(screen.getByTestId('appointment-history-search'), 'cefaleia')

    await waitFor(() =>
      expect(screen.getByTestId('appointment-history-item-rec-1')).toBeTruthy(),
    )
  })

  // `'null'` pede exatamente os sem especialidade; omitir traria todas.
  it('o generalista pede o recorte sem especialidade', async () => {
    await renderWithProviders(
      <HistoryTab patientId="pat-1" specialtyId={null} appointmentId="appt-1" />,
    )

    await waitFor(() =>
      expect(mockHistory).toHaveBeenCalledWith('pat-1', {
        specialtyId: 'null',
        excludeAppointmentId: 'appt-1',
        limit: 50,
      }),
    )
  })

  it('oferece tentar de novo quando falha', async () => {
    mockHistory.mockRejectedValue(new Error('rede'))

    await render()
    await screen.findByTestId('appointment-history-error')

    mockHistory.mockResolvedValue(page([record()]))
    fireEvent.press(screen.getByTestId('appointment-history-error-retry'))

    expect(await screen.findByTestId('appointment-history-item-rec-1')).toBeTruthy()
  })

  it('mostra o giro enquanto carrega', async () => {
    mockHistory.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('appointment-history-loading')).toBeTruthy()
  })
})
