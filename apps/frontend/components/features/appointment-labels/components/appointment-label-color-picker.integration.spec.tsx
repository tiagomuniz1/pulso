import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentLabelColor, APPOINTMENT_LABEL_COLOR_ORDER } from '@app/shared'
import { AppointmentLabelColorPicker } from './appointment-label-color-picker'

describe('AppointmentLabelColorPicker', () => {
  it('shows every colour of the palette at once', () => {
    render(<AppointmentLabelColorPicker value={undefined} onChange={jest.fn()} />)

    for (const color of APPOINTMENT_LABEL_COLOR_ORDER) {
      expect(screen.getByTestId(`appointment-label-color-${color}`)).toBeInTheDocument()
    }
    expect(APPOINTMENT_LABEL_COLOR_ORDER).toHaveLength(16)
  })

  it('reports the chosen colour', async () => {
    const onChange = jest.fn()
    render(<AppointmentLabelColorPicker value={undefined} onChange={onChange} />)

    await userEvent.click(screen.getByTestId(`appointment-label-color-${AppointmentLabelColor.GREEN}`))

    expect(onChange).toHaveBeenCalledWith(AppointmentLabelColor.GREEN)
  })

  it('marks the current value as checked', () => {
    render(<AppointmentLabelColorPicker value={AppointmentLabelColor.PLUM} onChange={jest.fn()} />)

    expect(screen.getByTestId(`appointment-label-color-${AppointmentLabelColor.PLUM}`)).toBeChecked()
  })

  // Amostra muda não serve a leitor de tela nem a quem não distingue os tons.
  it('names each colour in Portuguese for assistive tech', () => {
    render(<AppointmentLabelColorPicker value={undefined} onChange={jest.fn()} />)

    expect(screen.getByRole('radio', { name: 'Verde' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ardósia' })).toBeInTheDocument()
  })

  it('shows the validation error', () => {
    render(
      <AppointmentLabelColorPicker value={undefined} onChange={jest.fn()} error="Escolha uma cor" />,
    )

    expect(screen.getByTestId('appointment-label-form-color-error')).toHaveTextContent(
      'Escolha uma cor',
    )
  })
})
