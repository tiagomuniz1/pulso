import { Text } from 'react-native'
import { screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { EmptyState, ErrorState, LoadingState, Screen, ScreenScroll } from './screen'

describe('estados de tela', () => {
  it('shows the spinner', async () => {
    await renderWithProviders(<LoadingState testID="x-loading" />)

    expect(screen.getByTestId('x-loading')).toBeTruthy()
  })

  it('shows the empty message', async () => {
    await renderWithProviders(<EmptyState testID="x-empty" message="Nada aqui" />)

    expect(screen.getByText('Nada aqui')).toBeTruthy()
  })

  it('offers to try again when there is something to retry', async () => {
    await renderWithProviders(
      <ErrorState testID="x-error" message="Deu ruim" onRetry={jest.fn()} />,
    )

    expect(screen.getByTestId('x-error-retry')).toBeTruthy()
  })

  // Um botão "tentar de novo" que não tenta nada é pior que nenhum botão.
  it('omits the button when there is nothing to retry', async () => {
    await renderWithProviders(<ErrorState testID="x-error" message="Deu ruim" />)

    expect(screen.getByText('Deu ruim')).toBeTruthy()
    expect(screen.queryByTestId('x-error-retry')).toBeNull()
  })

  it('wraps the content in a scroll view', async () => {
    await renderWithProviders(
      <Screen testID="x-screen">
        <ScreenScroll testID="x-scroll">
          <Text>conteúdo</Text>
        </ScreenScroll>
      </Screen>,
    )

    expect(screen.getByTestId('x-scroll')).toBeTruthy()
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })
})
