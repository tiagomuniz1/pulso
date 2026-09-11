import { LABEL_STRIP_CLASS } from '@/components/features/appointment-labels/constants/label-color-classes'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import { AppointmentSlotCell } from './appointment-slot-cell'
import type { IAgendaSlot } from '../types/appointment-model.types'

const freeSlot: IAgendaSlot = {
  startTime: '09:00',
  endTime: '09:30',
  status: 'free',
  appointment: null,
}

const makeBookedSlot = (appointment: IAgendaSlot['appointment']): IAgendaSlot => ({
  startTime: '10:00',
  endTime: '10:30',
  status: 'booked',
  appointment,
})

const makeAppointment = (overrides = {}): NonNullable<IAgendaSlot['appointment']> => ({
  id: 'appt-1',
  professionalId: 'doc-1',
  professionalName: 'Dr. A',
  patientId: 'pat-1',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-1',
  date: '2025-06-10',
  startTime: '10:00',
  endTime: '10:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  label: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('AppointmentSlotCell', () => {
  it('renders free bookable slot when canManage and not past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeInTheDocument()
    expect(screen.getByTestId('agenda-slot-free')).not.toBeDisabled()
    expect(screen.getByText(/Livre — clique para agendar/)).toBeInTheDocument()
  })

  it('renders free disabled slot when canManage but is past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={true}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
    expect(screen.getByText('Passado')).toBeInTheDocument()
  })

  it('renders free read-only slot when cannot manage and not past', () => {
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={false}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-free')).toBeDisabled()
    expect(screen.getByText('Livre')).toBeInTheDocument()
  })

  it('renders booked slot when appointment is present', () => {
    const slot = makeBookedSlot({
      id: 'appt-1',
      professionalId: 'doc-1',
      professionalName: 'Dr. A',
      patientId: 'pat-1',
      patientName: 'Patient One',
      specialtyId: null,
      specialtyName: null,
      scheduleId: 'sched-1',
      date: '2025-06-10',
      startTime: '10:00',
      endTime: '10:30',
      status: AppointmentStatus.SCHEDULED,
      reason: null,
      cancellationReason: null,
      seriesId: null,
      seriesSequence: null,
      seriesTotalOccurrences: null,
  label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    render(
      <AppointmentSlotCell
        slot={slot}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(screen.getByTestId('agenda-slot-booked')).toBeInTheDocument()
    expect(screen.getByText('Patient One')).toBeInTheDocument()
  })

  it('calls onBookClick when free bookable slot is clicked', async () => {
    const onBookClick = jest.fn()
    render(
      <AppointmentSlotCell
        slot={freeSlot}
        canManage={true}
        isPast={false}
        onBookClick={onBookClick}
        onDetailsClick={jest.fn()}
      />,
    )
    await userEvent.click(screen.getByTestId('agenda-slot-free'))
    expect(onBookClick).toHaveBeenCalledTimes(1)
  })

  it('returns null when slot is booked but appointment is null', () => {
    const { container } = render(
      <AppointmentSlotCell
        slot={makeBookedSlot(null)}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
  it('marks a booked slot that belongs to a recurring series', () => {
    const slot = makeBookedSlot(
      makeAppointment({ seriesId: 'series-1', seriesSequence: 3, seriesTotalOccurrences: 10 }),
    )

    render(
      <AppointmentSlotCell
        slot={slot}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )

    expect(screen.getByTestId('agenda-slot-recurring')).toHaveAttribute(
      'aria-label',
      'Sessão 3 de 10',
    )
  })

  it('does not mark a standalone booked slot', () => {
    render(
      <AppointmentSlotCell
        slot={makeBookedSlot(makeAppointment())}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )

    expect(screen.queryByTestId('agenda-slot-recurring')).not.toBeInTheDocument()
  })
  it('drops the status label in dense mode so the patient name keeps the space', () => {
    render(
      <AppointmentSlotCell
        slot={makeBookedSlot(makeAppointment())}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
        dense
      />,
    )

    expect(screen.getByText('Patient One')).toBeInTheDocument()
    expect(screen.queryByText('Agendada')).not.toBeInTheDocument()
  })

  it('keeps the status label when not dense', () => {
    render(
      <AppointmentSlotCell
        slot={makeBookedSlot(makeAppointment())}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
      />,
    )

    expect(screen.getByText('Patient One')).toBeInTheDocument()
    expect(screen.getByText('Agendada')).toBeInTheDocument()
  })

  it('exposes the full patient name as a tooltip, since it can be truncated', () => {
    render(
      <AppointmentSlotCell
        slot={makeBookedSlot(makeAppointment())}
        canManage={true}
        isPast={false}
        onBookClick={jest.fn()}
        onDetailsClick={jest.fn()}
        dense
      />,
    )

    expect(screen.getByText('Patient One')).toHaveAttribute('title', 'Patient One')
  })

  describe('faixa do rótulo', () => {
    const comRotulo = (color = AppointmentLabelColor.GREEN) =>
      makeAppointment({ label: { id: 'l1', name: 'Retorno', color } })

    it('desenha a faixa na cor do rótulo', () => {
      render(<AppointmentSlotCell slot={makeBookedSlot(comRotulo())}
          canManage
          isPast={false}
          onBookClick={jest.fn()}
          onDetailsClick={jest.fn()}
        />)

      const faixa = screen.getByTestId('agenda-slot-label')
      expect(faixa).toHaveAttribute('data-label-color', AppointmentLabelColor.GREEN)
      // Compara com o mapa importado, não com a string: assim o teste sobrevive
      // a um rename de classe e ainda pega o componente pintando a cor errada.
      expect(faixa).toHaveClass(LABEL_STRIP_CLASS[AppointmentLabelColor.GREEN])
    })

    it('não desenha faixa quando a consulta não tem rótulo', () => {
      render(<AppointmentSlotCell slot={makeBookedSlot(makeAppointment())}
          canManage
          isPast={false}
          onBookClick={jest.fn()}
          onDetailsClick={jest.fn()}
        />)

      expect(screen.queryByTestId('agenda-slot-label')).not.toBeInTheDocument()
    })

    // Na visão semana o rótulo textual de status some e a borda é a única pista
    // de status — a faixa tem de conviver com ela, não substituí-la.
    it('desenha a faixa também na visão densa', () => {
      render(<AppointmentSlotCell slot={makeBookedSlot(comRotulo())}
          canManage
          isPast={false}
          dense
          onBookClick={jest.fn()}
          onDetailsClick={jest.fn()}
        />)

      expect(screen.getByTestId('agenda-slot-label')).toBeInTheDocument()
    })

    // Cor sozinha não pode ser a única portadora da informação.
    it('leva o nome do rótulo para o title e o aria-label', () => {
      render(<AppointmentSlotCell slot={makeBookedSlot(comRotulo())}
          canManage
          isPast={false}
          onBookClick={jest.fn()}
          onDetailsClick={jest.fn()}
        />)

      const botao = screen.getByTestId('agenda-slot-booked')
      expect(botao).toHaveAttribute('title', expect.stringContaining('Retorno'))
      expect(botao.getAttribute('aria-label')).toContain('rótulo Retorno')
    })
  })
})
