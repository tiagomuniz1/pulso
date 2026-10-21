import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { ConfirmSheet } from './confirm-sheet'

const props = {
  title: 'Excluir paciente',
  message: 'Tem certeza?',
  confirmLabel: 'Excluir',
  isOpen: true,
  isPending: false,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  testID: 'dialog',
}

beforeEach(() => jest.clearAllMocks())

describe('ConfirmSheet', () => {
  it('mostra a pergunta e confirma', async () => {
    await renderWithProviders(<ConfirmSheet {...props} />)

    expect(screen.getByTestId('dialog-message')).toHaveTextContent(/Tem certeza\?/)
    fireEvent.press(screen.getByTestId('dialog-confirm'))

    expect(props.onConfirm).toHaveBeenCalled()
  })

  it('fecha pelo cancelar e pelo fundo', async () => {
    await renderWithProviders(<ConfirmSheet {...props} />)

    fireEvent.press(screen.getByTestId('dialog-cancel'))

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('o fundo também fecha', async () => {
    await renderWithProviders(<ConfirmSheet {...props} />)

    fireEvent.press(screen.getByTestId('dialog-backdrop'))

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  /**
   * Enquanto a exclusão está em curso nada fecha o diálogo.
   *
   * Sair no meio deixaria a pessoa sem saber se apagou — e, pior, de volta à
   * lista que ainda mostra o registro, porque a invalidação do cache só
   * acontece quando a requisição volta.
   */
  it('não fecha enquanto exclui', async () => {
    await renderWithProviders(<ConfirmSheet {...props} isPending />)

    fireEvent.press(screen.getByTestId('dialog-backdrop'))
    expect(props.onClose).not.toHaveBeenCalled()

    expect(screen.getByTestId('dialog-cancel')).toBeDisabled()
  })

  it('fechado não desenha nada', async () => {
    await renderWithProviders(<ConfirmSheet {...props} isOpen={false} />)

    expect(screen.queryByTestId('dialog-message')).toBeNull()
  })
})
