import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { SURFACE_PALETTE, ThemeBorderRadius } from '@app/shared'
import { ThemeProvider, useTheme } from './theme-context'
import { DEFAULT_ACCENT } from './theme'

function Probe() {
  const theme = useTheme()
  return (
    <Text testID="probe">{`${theme.accent}|${theme.radius.md}|${theme.isDark}|${theme.surface2}`}</Text>
  )
}

describe('ThemeProvider', () => {
  it('veste o app com o tema da clínica', async () => {
    await render(
      <ThemeProvider clinic={{ accentColor: '#B5651D', borderRadius: ThemeBorderRadius.ROUND }}>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('probe')).toHaveTextContent(
      `#B5651D|16|false|${SURFACE_PALETTE.surface2.light}`,
    )
  })

  // Antes do login não há clínica para representar — e isso não é um erro.
  it('cai no acento padrão quando a clínica ainda não é conhecida', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('probe')).toHaveTextContent(
      `${DEFAULT_ACCENT}|8|false|${SURFACE_PALETTE.surface2.light}`,
    )
  })

  // Lançar, e não devolver um padrão: um componente fora do provider
  // renderizaria com as cores erradas e ninguém notaria até a clínica reclamar.
  it('lança quando usado fora do provider', async () => {
    const silence = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(render(<Probe />)).rejects.toThrow('useTheme precisa estar dentro de ThemeProvider')

    silence.mockRestore()
  })
})
