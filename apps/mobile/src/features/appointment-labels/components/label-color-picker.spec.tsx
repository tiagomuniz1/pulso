import { AppointmentLabelColor, APPOINTMENT_LABEL_COLOR_HEX } from '@app/shared'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useThemeStore } from '../../../theme/theme.store'
import { LabelColorPicker } from './label-color-picker'

const onChange = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  useThemeStore.setState({ mode: 'light' })
})

describe('LabelColorPicker', () => {
  it('mostra as dezesseis cores da paleta', async () => {
    await renderWithProviders(
      <LabelColorPicker value={null} onChange={onChange} testID="picker" />,
    )

    expect(screen.getByTestId('picker-green')).toBeTruthy()
    expect(screen.getByTestId('picker-rose')).toBeTruthy()
  })

  it('escolher devolve a cor', async () => {
    await renderWithProviders(
      <LabelColorPicker value={null} onChange={onChange} testID="picker" />,
    )

    fireEvent.press(screen.getByTestId('picker-bronze'))

    expect(onChange).toHaveBeenCalledWith(AppointmentLabelColor.BRONZE)
  })

  it('a cor escolhida fica marcada', async () => {
    await renderWithProviders(
      <LabelColorPicker value={AppointmentLabelColor.GREEN} onChange={onChange} testID="picker" />,
    )

    expect(screen.getByTestId('picker-green').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('picker-rose').props.accessibilityState.checked).toBe(false)
  })

  /**
   * Cada cor tem duas variantes porque hex não tem modo escuro — é
   * exatamente o motivo de o banco guardar o identificador e não o hex. No
   * escuro a amostra tem de usar a variante escura, senão a faixa some no
   * fundo.
   */
  it('no modo escuro usa a variante escura', async () => {
    useThemeStore.setState({ mode: 'dark' })

    await renderWithProviders(
      <LabelColorPicker value={null} onChange={onChange} testID="picker" />,
    )

    const swatch = screen.getByTestId('picker-green')
    const flattened = Object.assign({}, ...[swatch.props.style].flat(2))
    expect(flattened.backgroundColor).toBe(APPOINTMENT_LABEL_COLOR_HEX.green.dark.soft)
  })

  it('mostra o erro quando há um', async () => {
    await renderWithProviders(
      <LabelColorPicker value={null} onChange={onChange} error="Escolha uma cor" testID="picker" />,
    )

    expect(screen.getByTestId('picker-error')).toHaveTextContent(/Escolha uma cor/)
  })
})
