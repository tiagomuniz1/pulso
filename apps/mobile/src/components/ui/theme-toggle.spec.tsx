import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { useThemeStore } from '../../theme/theme.store'
import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => useThemeStore.setState({ mode: 'light' }))

  // O rótulo diz para onde vai, não onde está: "Escuro" num app claro é o
  // botão que escurece. O contrário faria a pessoa tocar para confirmar.
  it.each([
    ['light', 'Escuro'],
    ['dark', 'Claro'],
  ] as const)('no tema %s o botão oferece %s', async (mode, label) => {
    useThemeStore.setState({ mode })

    await renderWithProviders(<ThemeToggle />)

    expect(screen.getByTestId('theme-toggle')).toHaveTextContent(label)
  })

  it('troca o tema ao ser tocado', async () => {
    await renderWithProviders(<ThemeToggle />)

    fireEvent.press(screen.getByTestId('theme-toggle'))

    expect(useThemeStore.getState().mode).toBe('dark')
  })

  it('tem rótulo de acessibilidade dizendo o destino', async () => {
    await renderWithProviders(<ThemeToggle />)

    expect(screen.getByLabelText('Mudar para o tema escuro')).toBeTruthy()
  })
})
