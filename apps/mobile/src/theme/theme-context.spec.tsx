import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { ThemeBorderRadius } from '@app/shared'
import { ThemeProvider, useTheme } from './theme-context'
import { DEFAULT_ACCENT } from './theme'

function Probe() {
  const theme = useTheme()
  return <Text testID="probe">{`${theme.accent}|${theme.radius.md}|${theme.isDark}`}</Text>
}

describe('ThemeProvider', () => {
  it('entrega os tokens derivados do acento da clínica', async () => {
    await render(
      <ThemeProvider accentHex="#B5651D" borderRadius={ThemeBorderRadius.ROUND}>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('probe')).toHaveTextContent('#B5651D|16|false')
  })

  // Antes do login a clínica é desconhecida, e a tela ainda precisa de cor.
  it('cai no acento padrão quando a clínica não é conhecida', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('probe')).toHaveTextContent(`${DEFAULT_ACCENT}|8|false`)
  })

  // Lançar, e não devolver um padrão: um componente fora do provider
  // renderizaria com as cores erradas e ninguém notaria até a clínica reclamar.
  it('lança quando usado fora do provider', async () => {
    const silence = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(render(<Probe />)).rejects.toThrow('useTheme precisa estar dentro de ThemeProvider')

    silence.mockRestore()
  })
})
