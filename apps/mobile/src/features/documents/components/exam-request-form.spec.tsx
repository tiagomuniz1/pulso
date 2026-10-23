import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { ExamRequestForm } from './exam-request-form'

const onSubmit = jest.fn()
const onClose = jest.fn()

async function open() {
  onSubmit.mockClear()
  onClose.mockClear()
  return renderWithProviders(
    <ExamRequestForm
      appointmentId="appt-1"
      isOpen
      isSaving={false}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )
}

async function type(testID: string, value: string) {
  fireEvent.changeText(screen.getByTestId(testID), value)
  await waitFor(() => expect(screen.getByTestId(testID).props.value).toBe(value))
}

describe('ExamRequestForm', () => {
  it('abre com um exame', async () => {
    await open()

    expect(screen.getByTestId('exam-item-0')).toBeTruthy()
    expect(screen.queryByTestId('exam-item-1')).toBeNull()
  })

  it('solicita um exame', async () => {
    await open()
    await type('exam-name-0', 'Hemograma completo')
    await type('exam-observations-0', 'Jejum de 8 horas')
    await type('exam-notes', 'Trazer resultado no retorno')

    fireEvent.press(screen.getByTestId('exam-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
      notes: 'Trazer resultado no retorno',
    })
  })

  it('acrescenta e remove exames', async () => {
    await open()
    fireEvent.press(screen.getByTestId('exam-add'))
    await waitFor(() => expect(screen.getByTestId('exam-item-1')).toBeTruthy())

    fireEvent.press(screen.getByTestId('exam-remove-1'))
    await waitFor(() => expect(screen.queryByTestId('exam-item-1')).toBeNull())
  })

  // O primeiro não tem "Remover": um pedido sem exame nenhum não é pedido.
  it('não deixa remover o único exame', async () => {
    await open()

    expect(screen.queryByTestId('exam-remove-0')).toBeNull()
  })

  it('solicita vários de uma vez', async () => {
    await open()
    await type('exam-name-0', 'Hemograma')
    fireEvent.press(screen.getByTestId('exam-add'))
    await waitFor(() => expect(screen.getByTestId('exam-name-1')).toBeTruthy())
    await type('exam-name-1', 'Glicemia')

    fireEvent.press(screen.getByTestId('exam-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ name: 'Hemograma' }, { name: 'Glicemia' }],
    })
  })

  // Linha acrescentada e deixada em branco não vira exame sem nome.
  it('ignora a linha em branco', async () => {
    await open()
    await type('exam-name-0', 'Hemograma')
    fireEvent.press(screen.getByTestId('exam-add'))
    await waitFor(() => expect(screen.getByTestId('exam-item-1')).toBeTruthy())

    fireEvent.press(screen.getByTestId('exam-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ name: 'Hemograma' }],
    })
  })

  it('recusa um pedido sem nenhum exame', async () => {
    await open()

    fireEvent.press(screen.getByTestId('exam-submit'))

    expect(await screen.findByTestId('exam-name-0-error')).toHaveTextContent(/ao menos um exame/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('fecha pelo X', async () => {
    await open()

    fireEvent.press(screen.getByTestId('exam-form-close'))

    expect(onClose).toHaveBeenCalled()
  })
})
