import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { Button } from './button'

describe('Button', () => {
  it('calls the handler when pressed', async () => {
    const onPress = jest.fn()
    await renderWithProviders(<Button label="Salvar" onPress={onPress} testID="b" />)

    fireEvent.press(screen.getByTestId('b'))

    expect(onPress).toHaveBeenCalled()
  })

  // Enquanto a requisição está em voo, um segundo toque criaria um segundo
  // prontuário — e num celular o toque duplo é acidente comum.
  it('shows a spinner and refuses the press while loading', async () => {
    const onPress = jest.fn()
    await renderWithProviders(<Button label="Salvar" onPress={onPress} loading testID="b" />)

    expect(screen.getByTestId('b-spinner')).toBeTruthy()
    expect(screen.queryByText('Salvar')).toBeNull()

    fireEvent.press(screen.getByTestId('b'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('refuses the press when disabled', async () => {
    const onPress = jest.fn()
    await renderWithProviders(<Button label="Salvar" onPress={onPress} disabled testID="b" />)

    fireEvent.press(screen.getByTestId('b'))

    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByTestId('b')).toHaveStyle({ opacity: 0.5 })
  })

  it.each(['primary', 'outline', 'danger'] as const)('renders the %s variant', async (variant) => {
    await renderWithProviders(
      <Button label="Ação" onPress={jest.fn()} variant={variant} testID="b" />,
    )

    expect(screen.getByText('Ação')).toBeTruthy()
  })
})
