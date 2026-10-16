import { getReassignCandidatesUseCase, reassignAppointmentUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { ReassignSheet } from './reassign-sheet'

jest.mock('@app/core/src/features/appointments/use-cases/get-reassign-candidates.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/reassign-appointment.use-case')

const mockCandidates = getReassignCandidatesUseCase as jest.MockedFunction<
  typeof getReassignCandidatesUseCase
>
const mockReassign = reassignAppointmentUseCase as jest.MockedFunction<typeof reassignAppointmentUseCase>

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockCandidates.mockResolvedValue([
    { professionalId: 'doc-2', professionalName: 'Dr. Bruno', specialtyName: 'Ginecologia' },
  ])
})

function render() {
  return renderWithProviders(<ReassignSheet appointmentId="appt-1" isOpen onClose={onClose} />)
}

async function choose() {
  fireEvent.press(await screen.findByTestId('reassign-professional'))
  fireEvent.press(await screen.findByTestId('reassign-professional-option-doc-2'))
  await waitFor(() =>
    expect(screen.getByTestId('reassign-professional')).toHaveTextContent(/Dr\. Bruno/),
  )
}

describe('ReassignSheet', () => {
  it('lista o candidato com a especialidade', async () => {
    await render()
    fireEvent.press(await screen.findByTestId('reassign-professional'))

    expect(
      await screen.findByTestId('reassign-professional-option-doc-2'),
    ).toHaveTextContent('Dr. Bruno — Ginecologia')
  })

  it('troca o profissional e fecha', async () => {
    mockReassign.mockResolvedValue({ id: 'appt-1' } as never)

    await render()
    await choose()
    fireEvent.press(screen.getByTestId('reassign-submit'))

    await waitFor(() => expect(mockReassign).toHaveBeenCalledWith('appt-1', 'doc-2'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('não troca sem escolher ninguém', async () => {
    await render()

    expect(await screen.findByTestId('reassign-submit')).toBeDisabled()
  })

  it('diz quando não há ninguém disponível', async () => {
    mockCandidates.mockResolvedValue([])

    await render()

    expect(await screen.findByTestId('reassign-empty')).toBeTruthy()
    expect(screen.queryByTestId('reassign-professional')).toBeNull()
  })

  it('oferece tentar de novo quando a lista falha', async () => {
    mockCandidates.mockRejectedValue(new Error('rede'))

    await render()
    await screen.findByTestId('reassign-error')

    mockCandidates.mockResolvedValue([
      { professionalId: 'doc-2', professionalName: 'Dr. Bruno', specialtyName: null },
    ])
    fireEvent.press(screen.getByTestId('reassign-error-retry'))

    expect(await screen.findByTestId('reassign-professional')).toBeTruthy()
  })

  it('mostra o giro enquanto carrega', async () => {
    mockCandidates.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('reassign-loading')).toBeTruthy()
  })

  /**
   * Cada recusa tem uma saída diferente: o 422 pede outro profissional, o
   * 409 pede outro porque este acabou de encher. Dizer "erro" nos dois
   * casos esconde o que fazer a seguir.
   */
  it.each([
    [422, /não está disponível/],
    [409, /acabou de ser preenchido/],
    [500, /Ocorreu um erro/],
  ])('explica a recusa %s', async (status, message) => {
    mockReassign.mockRejectedValue({ status, title: 'x', detail: 'y' })

    await render()
    await choose()
    fireEvent.press(screen.getByTestId('reassign-submit'))

    expect(await screen.findByTestId('reassign-submit-error')).toHaveTextContent(message)
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('reassign-sheet-close'))

    expect(onClose).toHaveBeenCalled()
  })
})
