import { RecurrenceInterval, RecurringOccurrenceAvailability } from '@app/shared'
import {
  bookAppointmentUseCase,
  bookRecurringAppointmentsUseCase,
  getProfessionalUseCase,
  listPatientsUseCase,
  previewRecurrenceUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { BookAppointmentSheet } from './book-appointment-sheet'

jest.mock('@app/core/src/features/patients/use-cases/list-patients.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-professional.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/book-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/book-recurring-appointments.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/preview-recurrence.use-case')

const mockPatients = listPatientsUseCase as jest.MockedFunction<typeof listPatientsUseCase>
const mockProfessional = getProfessionalUseCase as jest.MockedFunction<typeof getProfessionalUseCase>
const mockBook = bookAppointmentUseCase as jest.MockedFunction<typeof bookAppointmentUseCase>
const mockBookSeries = bookRecurringAppointmentsUseCase as jest.MockedFunction<
  typeof bookRecurringAppointmentsUseCase
>
const mockPreview = previewRecurrenceUseCase as jest.MockedFunction<typeof previewRecurrenceUseCase>

const professional = (specialties: { id: string; name: string }[]) =>
  ({ id: 'prof-1', specialties }) as never

const preview = (overrides = {}) =>
  ({
    professionalId: 'prof-1',
    recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
    startTime: '08:00',
    occurrences: [
      {
        date: '2026-04-13',
        startTime: '08:00',
        endTime: '08:30',
        availability: RecurringOccurrenceAvailability.AVAILABLE,
        selectable: true,
      },
      {
        date: '2026-04-20',
        startTime: '08:00',
        endTime: '08:30',
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        selectable: false,
      },
    ],
    availableOccurrenceCount: 1,
    unavailableOccurrenceCount: 1,
    truncatedByMaximumOccurrences: false,
    truncatedByHorizon: false,
    ...overrides,
  }) as never

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockPatients.mockResolvedValue([{ id: 'pat-1', fullName: 'Maria Silva' }] as never)
  mockProfessional.mockResolvedValue(professional([{ id: 'spec-1', name: 'Ginecologia' }]))
  mockPreview.mockResolvedValue(preview())
})

// Objeto inteiro com padrão, e não chave com padrão: `{ professionalId:
// undefined }` cairia no valor padrão e o teste do PROFESSIONAL renderizaria
// com um id.
function render({ professionalId }: { professionalId?: string } = { professionalId: 'prof-1' }) {
  return renderWithProviders(
    <BookAppointmentSheet
      isOpen
      onClose={onClose}
      date="2026-04-13"
      startTime="08:00"
      endTime="08:30"
      professionalId={professionalId}
    />,
  )
}

async function choosePatient() {
  fireEvent.press(await screen.findByTestId('book-patient'))
  fireEvent.press(await screen.findByTestId('book-patient-option-pat-1'))
  await waitFor(() => expect(screen.getByTestId('book-patient')).toHaveTextContent(/Maria Silva/))
}

describe('BookAppointmentSheet — agendar uma consulta', () => {
  it('mostra a data e o horário do slot escolhido', async () => {
    await render()

    expect(await screen.findByTestId('book-slot')).toHaveTextContent(/13\/04\/2026 · 08:00 – 08:30/)
  })

  it('agenda e fecha', async () => {
    mockBook.mockResolvedValue({ id: 'appt-1' } as never)

    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-submit'))

    await waitFor(() =>
      expect(mockBook).toHaveBeenCalledWith({
        professionalId: 'prof-1',
        patientId: 'pat-1',
        date: '2026-04-13',
        startTime: '08:00',
        reason: undefined,
        specialtyId: 'spec-1',
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('recusa sem paciente', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('book-submit'))

    expect(await screen.findByTestId('book-validation-error')).toHaveTextContent(
      /Selecione um paciente/,
    )
    expect(mockBook).not.toHaveBeenCalled()
  })

  // Com uma especialidade só não há escolha a fazer, e ela vai no corpo de
  // qualquer forma — o seletor seria um campo de uma opção.
  it('com uma especialidade, não pede escolha', async () => {
    await render()
    await screen.findByTestId('book-patient')

    expect(screen.queryByTestId('book-specialty')).toBeNull()
  })

  it('com várias especialidades, exige escolher uma', async () => {
    mockProfessional.mockResolvedValue(
      professional([
        { id: 'spec-1', name: 'Ginecologia' },
        { id: 'spec-2', name: 'Obstetrícia' },
      ]),
    )

    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-submit'))

    expect(await screen.findByTestId('book-validation-error')).toHaveTextContent(
      /Selecione uma especialidade/,
    )

    fireEvent.press(screen.getByTestId('book-specialty'))
    fireEvent.press(await screen.findByTestId('book-specialty-option-spec-2'))
    await waitFor(() => expect(screen.getByTestId('book-specialty')).toHaveTextContent(/Obstetrícia/))
    fireEvent.press(screen.getByTestId('book-submit'))

    await waitFor(() =>
      expect(mockBook).toHaveBeenCalledWith(expect.objectContaining({ specialtyId: 'spec-2' })),
    )
  })

  /**
   * O PROFESSIONAL agenda na própria agenda, e o servidor usa a ficha dele.
   * Sem profissional escolhido não há especialidade a buscar.
   */
  it('sem profissional, não pede a ficha nem manda o id', async () => {
    mockBook.mockResolvedValue({ id: 'appt-1' } as never)

    await render({ professionalId: undefined })
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-submit'))

    await waitFor(() => expect(mockBook).toHaveBeenCalled())
    expect(mockProfessional).not.toHaveBeenCalled()
    expect(mockBook.mock.calls[0][0].professionalId).toBeUndefined()
    expect(mockBook.mock.calls[0][0].specialtyId).toBeUndefined()
  })

  it('manda o motivo quando preenchido', async () => {
    mockBook.mockResolvedValue({ id: 'appt-1' } as never)

    await render()
    await choosePatient()
    fireEvent.changeText(screen.getByTestId('book-reason'), '  Dor lombar  ')
    await waitFor(() => expect(screen.getByTestId('book-reason').props.value).toBe('  Dor lombar  '))
    fireEvent.press(screen.getByTestId('book-submit'))

    await waitFor(() =>
      expect(mockBook).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Dor lombar' })),
    )
  })

  it.each([
    [409, /acabou de ser reservado/],
    [422, /no passado/],
    [500, /Ocorreu um erro ao agendar/],
  ])('explica a recusa %s', async (status, message) => {
    mockBook.mockRejectedValue({ status, title: 'x', detail: 'y' })

    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-submit'))

    expect(await screen.findByTestId('book-error')).toHaveTextContent(message)
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('book-appointment-sheet-close'))

    expect(onClose).toHaveBeenCalled()
  })
})

describe('BookAppointmentSheet — série', () => {
  async function goToReview() {
    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-recurring-toggle'))
    await screen.findByTestId('book-recurrence-fields')
    fireEvent.press(screen.getByTestId('book-submit'))
  }

  /**
   * O segundo passo existe porque a série atravessa meses: o horário livre
   * hoje pode estar ocupado em maio, e quem agenda precisa ver isso antes.
   */
  it('revisa as datas antes de agendar', async () => {
    await goToReview()

    expect(await screen.findByTestId('preview-summary')).toHaveTextContent(
      /2 datas · 1 disponíveis · 1 indisponíveis/,
    )
    expect(mockBookSeries).not.toHaveBeenCalled()
  })

  // Toda data disponível começa marcada; a ocupada nem marcável é, porque o
  // servidor a recusaria de qualquer forma.
  it('marca as disponíveis e trava as ocupadas', async () => {
    await goToReview()
    await screen.findByTestId('preview-list')

    expect(screen.getByTestId('preview-selected-count')).toHaveTextContent(/1 datas selecionadas/)
    expect(screen.getByTestId('preview-item-2026-04-20')).toBeDisabled()
    expect(screen.getByTestId('preview-status-2026-04-20')).toHaveTextContent(/Ocupado/)
  })

  it('agenda a série com as datas marcadas', async () => {
    mockBookSeries.mockResolvedValue({ seriesId: 'ser-1' } as never)

    await goToReview()
    fireEvent.press(await screen.findByTestId('book-confirm-series'))

    await waitFor(() =>
      expect(mockBookSeries).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'pat-1',
          dates: ['2026-04-13'],
          recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
          occurrenceCount: 4,
        }),
      ),
    )
  })

  it('desmarca e marca todas de uma vez', async () => {
    await goToReview()
    fireEvent.press(await screen.findByTestId('preview-toggle-all'))

    await waitFor(() =>
      expect(screen.getByTestId('preview-selected-count')).toHaveTextContent(/0 datas/),
    )
    expect(screen.getByTestId('book-confirm-series')).toBeDisabled()

    fireEvent.press(screen.getByTestId('preview-toggle-all'))

    await waitFor(() =>
      expect(screen.getByTestId('preview-selected-count')).toHaveTextContent(/1 datas/),
    )
  })

  it('desmarca e remarca uma data sozinha', async () => {
    await goToReview()
    fireEvent.press(await screen.findByTestId('preview-item-2026-04-13'))

    await waitFor(() =>
      expect(screen.getByTestId('preview-selected-count')).toHaveTextContent(/0 datas/),
    )

    fireEvent.press(screen.getByTestId('preview-item-2026-04-13'))

    await waitFor(() =>
      expect(screen.getByTestId('preview-selected-count')).toHaveTextContent(/1 datas/),
    )
  })

  // O PROFESSIONAL agenda a série na própria agenda: sem profissional
  // escolhido não há especialidade a mandar.
  it('a série do profissional vai sem id e sem especialidade', async () => {
    mockBookSeries.mockResolvedValue({ seriesId: 'ser-1' } as never)

    await render({ professionalId: undefined })
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-recurring-toggle'))
    await screen.findByTestId('book-recurrence-fields')
    fireEvent.press(screen.getByTestId('book-submit'))
    fireEvent.press(await screen.findByTestId('book-confirm-series'))

    await waitFor(() => expect(mockBookSeries).toHaveBeenCalled())
    expect(mockBookSeries.mock.calls[0][0].professionalId).toBeUndefined()
    expect(mockBookSeries.mock.calls[0][0].specialtyId).toBeUndefined()
  })

  it.each([
    ['0', /entre 2 e 26/],
    ['99', /entre 2 e 26/],
    ['abc', /entre 2 e 26/],
  ])('recusa %s consultas', async (count, message) => {
    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-recurring-toggle'))
    fireEvent.changeText(await screen.findByTestId('book-occurrence-count'), count)
    await waitFor(() => expect(screen.getByTestId('book-occurrence-count').props.value).toBe(count))
    fireEvent.press(screen.getByTestId('book-submit'))

    expect(await screen.findByTestId('book-validation-error')).toHaveTextContent(message)
    expect(mockPreview).not.toHaveBeenCalled()
  })

  it('troca o intervalo da recorrência', async () => {
    await render()
    await choosePatient()
    fireEvent.press(screen.getByTestId('book-recurring-toggle'))
    fireEvent.press(await screen.findByTestId('book-recurrence-interval'))
    fireEvent.press(
      await screen.findByTestId(`book-recurrence-interval-option-${RecurrenceInterval.EVERY_TWO_WEEKS}`),
    )
    await waitFor(() =>
      expect(screen.getByTestId('book-recurrence-interval')).toHaveTextContent(/A cada 2 semanas/),
    )
    fireEvent.press(screen.getByTestId('book-submit'))

    await waitFor(() =>
      expect(mockPreview).toHaveBeenCalledWith(
        expect.objectContaining({ recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS }),
      ),
    )
  })

  it('volta ao formulário', async () => {
    await goToReview()
    fireEvent.press(await screen.findByTestId('book-back-to-form'))

    expect(await screen.findByTestId('book-patient')).toBeTruthy()
  })

  it('avisa quando a série foi limitada', async () => {
    mockPreview.mockResolvedValue(
      preview({ truncatedByMaximumOccurrences: true, truncatedByHorizon: true }),
    )

    await goToReview()

    expect(await screen.findByTestId('preview-truncated')).toBeTruthy()
    expect(screen.getByTestId('preview-truncated-horizon')).toBeTruthy()
  })

  it('oferece tentar de novo quando a previsão falha', async () => {
    mockPreview.mockRejectedValue(new Error('rede'))

    await goToReview()
    await screen.findByTestId('preview-error')

    mockPreview.mockResolvedValue(preview())
    fireEvent.press(screen.getByTestId('preview-error-retry'))

    expect(await screen.findByTestId('preview-summary')).toBeTruthy()
  })

  it('mostra o giro enquanto calcula as datas', async () => {
    mockPreview.mockReturnValue(new Promise(() => {}))

    await goToReview()

    expect(await screen.findByTestId('preview-loading')).toBeTruthy()
  })

  // O 409 da série diz *quais* datas encheram — repeti-lo como erro genérico
  // obrigaria a conferir as vinte uma a uma.
  it('nomeia as datas que deixaram de estar livres', async () => {
    mockBookSeries.mockRejectedValue({
      status: 409,
      title: 'x',
      detail: 'y',
      conflictingOccurrences: [{ date: '2026-04-13' }],
    })

    await goToReview()
    fireEvent.press(await screen.findByTestId('book-confirm-series'))

    expect(await screen.findByTestId('book-series-error')).toHaveTextContent(/13\/04\/2026/)
  })

  it('sem a lista de conflitos, diz o genérico do 409', async () => {
    mockBookSeries.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await goToReview()
    fireEvent.press(await screen.findByTestId('book-confirm-series'))

    expect(await screen.findByTestId('book-series-error')).toHaveTextContent(
      /Algumas datas deixaram de estar disponíveis/,
    )
  })

  it('avisa nos outros erros da série', async () => {
    mockBookSeries.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await goToReview()
    fireEvent.press(await screen.findByTestId('book-confirm-series'))

    expect(await screen.findByTestId('book-series-error')).toHaveTextContent(
      /Ocorreu um erro ao agendar a série/,
    )
  })
})
