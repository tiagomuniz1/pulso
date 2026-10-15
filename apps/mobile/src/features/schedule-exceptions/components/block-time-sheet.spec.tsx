import { createScheduleExceptionUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { BlockTimeSheet } from './block-time-sheet'

jest.mock('@app/core/src/features/schedule-exceptions/use-cases/create-schedule-exception.use-case')

const mockCreate = createScheduleExceptionUseCase as jest.MockedFunction<
  typeof createScheduleExceptionUseCase
>

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockCreate.mockResolvedValue({ id: 'exc-1' } as never)
})

function render({ isAdmin = true, professionalId = 'prof-1' as string | undefined } = {}) {
  return renderWithProviders(
    <BlockTimeSheet
      isOpen
      onClose={onClose}
      date="2026-04-12"
      isAdmin={isAdmin}
      professionalId={professionalId}
    />,
  )
}

async function type(testID: string, text: string) {
  fireEvent.changeText(await screen.findByTestId(testID), text)
  await waitFor(() => expect(screen.getByTestId(testID).props.value).toBe(text))
}

describe('BlockTimeSheet', () => {
  // A data é a da agenda aberta: um campo editável aqui bloquearia um dia
  // que não está à vista.
  it('mostra a data da agenda, sem deixar editar', async () => {
    await render()

    expect(await screen.findByTestId('block-date')).toHaveTextContent('12/04/2026')
  })

  it('bloqueia uma janela de horário', async () => {
    await render()
    await type('block-start-time', '12:00')
    await type('block-end-time', '13:00')
    await type('block-reason', ' Almoço ')

    fireEvent.press(screen.getByTestId('block-submit'))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        professionalId: 'prof-1',
        date: '2026-04-12',
        startTime: '12:00',
        endTime: '13:00',
        reason: 'Almoço',
      }),
    )
  })

  it('o dia inteiro dispensa os horários', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('block-all-day'))

    await waitFor(() => expect(screen.queryByTestId('block-start-time')).toBeNull())

    fireEvent.press(screen.getByTestId('block-submit'))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: null, endTime: null, reason: null }),
      ),
    )
  })

  /**
   * O profissional bloqueia a própria agenda, e o servidor já sabe quem ele
   * é. Mandar o id do profissional selecionado na barra bloquearia a agenda
   * de outra pessoa.
   */
  it('o profissional não manda id nenhum', async () => {
    await render({ isAdmin: false })
    fireEvent.press(await screen.findByTestId('block-all-day'))
    await waitFor(() => expect(screen.queryByTestId('block-start-time')).toBeNull())

    fireEvent.press(screen.getByTestId('block-submit'))

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(mockCreate.mock.calls[0][0].professionalId).toBeUndefined()
  })

  it.each([
    ['sem início', { start: '', end: '13:00' }, /Horário inicial obrigatório/],
    ['sem fim', { start: '12:00', end: '' }, /Horário final obrigatório/],
    ['fim antes do início', { start: '13:00', end: '12:00' }, /após o inicial/],
  ])('recusa %s', async (_caso, { start, end }, message) => {
    await render()
    if (start) await type('block-start-time', start)
    if (end) await type('block-end-time', end)

    fireEvent.press(screen.getByTestId('block-submit'))

    expect(await screen.findByTestId('block-validation-error')).toHaveTextContent(message)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // O 409 tem causa e solução próprias: repeti-lo como erro genérico faria a
  // pessoa tentar de novo sem saber o que mudar.
  it('explica o conflito com consulta agendada', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('block-all-day'))
    await waitFor(() => expect(screen.queryByTestId('block-start-time')).toBeNull())
    fireEvent.press(screen.getByTestId('block-submit'))

    expect(await screen.findByTestId('block-conflict-error')).toBeTruthy()
    expect(screen.queryByTestId('block-error')).toBeNull()
  })

  it('avisa genericamente nos outros erros', async () => {
    mockCreate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('block-all-day'))
    await waitFor(() => expect(screen.queryByTestId('block-start-time')).toBeNull())
    fireEvent.press(screen.getByTestId('block-submit'))

    expect(await screen.findByTestId('block-error')).toBeTruthy()
  })

  it('fecha a folha depois de bloquear', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('block-all-day'))
    await waitFor(() => expect(screen.queryByTestId('block-start-time')).toBeNull())
    fireEvent.press(screen.getByTestId('block-submit'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('block-time-sheet-close'))

    expect(onClose).toHaveBeenCalled()
  })
})
