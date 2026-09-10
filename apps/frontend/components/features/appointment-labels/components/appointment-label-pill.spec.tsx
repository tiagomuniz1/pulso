import { render, screen } from '@testing-library/react'
import { AppointmentLabelColor } from '@app/shared'
import { LABEL_PILL_CLASS } from '../constants/label-color-classes'
import { AppointmentLabelPill } from './appointment-label-pill'

describe('AppointmentLabelPill', () => {
  it('always shows the name, not just the colour', () => {
    render(<AppointmentLabelPill name="Retorno" color={AppointmentLabelColor.GREEN} />)

    expect(screen.getByTestId('appointment-label-pill')).toHaveTextContent('Retorno')
  })

  it('paints with the class of its colour', () => {
    render(<AppointmentLabelPill name="Retorno" color={AppointmentLabelColor.PLUM} />)

    const pill = screen.getByTestId('appointment-label-pill')
    expect(pill).toHaveAttribute('data-label-color', AppointmentLabelColor.PLUM)
    expect(pill).toHaveClass(LABEL_PILL_CLASS[AppointmentLabelColor.PLUM])
  })

  // O raio do tema vai de 2px a 32px; uma pílula precisa ser sempre uma pílula.
  it('uses rounded-full, which does not depend on the clinic theme radius', () => {
    render(<AppointmentLabelPill name="Retorno" color={AppointmentLabelColor.ROSE} />)

    expect(screen.getByTestId('appointment-label-pill')).toHaveClass('rounded-full')
  })
})
