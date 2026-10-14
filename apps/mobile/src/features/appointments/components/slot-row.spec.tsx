import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import type { IAgendaSlot } from '@app/core'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useThemeStore } from '../../../theme/theme.store'
import { SlotRow } from './slot-row'

const free: IAgendaSlot = { startTime: '08:00', endTime: '08:30', status: 'free', appointment: null }

const booked = (overrides = {}): IAgendaSlot => ({
  startTime: '09:00',
  endTime: '09:30',
  status: 'booked',
  appointment: {
    id: 'appt-1',
    patientName: 'Maria Silva',
    status: AppointmentStatus.SCHEDULED,
    seriesId: null,
    seriesSequence: null,
    seriesTotalOccurrences: null,
    label: null,
    ...overrides,
  } as never,
})

const onPress = jest.fn()

beforeEach(() => {
  onPress.mockClear()
  useThemeStore.setState({ mode: 'light' })
})

describe('SlotRow — horário livre', () => {
  // O texto é o da web: quem gerencia agenda lê o convite, quem não gerencia
  // lê só o estado.
  it('convida a agendar quem gerencia agenda', async () => {
    await renderWithProviders(
      <SlotRow slot={free} canManage isPast={false} onPress={onPress} />,
    )

    expect(screen.getByTestId('agenda-slot-free')).toHaveTextContent(
      '08:00Livre — clique para agendar',
    )
  })

  it('para a recepção, só informa que está livre', async () => {
    await renderWithProviders(
      <SlotRow slot={free} canManage={false} isPast={false} onPress={onPress} />,
    )

    expect(screen.getByTestId('agenda-slot-free')).toHaveTextContent('08:00Livre')
  })

  // Horário que já passou não é oferta: a web escreve "Passado" e apaga a linha.
  it('mostra "Passado" e apaga a linha quando a hora já passou', async () => {
    await renderWithProviders(<SlotRow slot={free} canManage isPast onPress={onPress} />)

    expect(screen.getByTestId('agenda-slot-free')).toHaveTextContent('08:00Passado')
    expect(screen.getByTestId('agenda-slot-free')).toHaveStyle({ opacity: 0.4 })
  })

  // A recepção lê a agenda, mas não agenda — a linha fica apagada para ela.
  it('apaga a linha para quem não gerencia agenda', async () => {
    await renderWithProviders(
      <SlotRow slot={free} canManage={false} isPast={false} onPress={onPress} />,
    )

    expect(screen.getByTestId('agenda-slot-free')).toHaveStyle({ opacity: 0.4 })
  })

  it('não leva a lugar nenhum', async () => {
    await renderWithProviders(<SlotRow slot={free} canManage isPast={false} onPress={onPress} />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('SlotRow — consulta', () => {
  it('mostra hora, paciente e situação', async () => {
    await renderWithProviders(
      <SlotRow slot={booked()} canManage isPast={false} onPress={onPress} />,
    )

    expect(screen.getByTestId('agenda-slot-booked-appt-1')).toHaveTextContent(
      '09:00Maria SilvaAgendada',
    )
  })

  it('devolve o id ao ser tocada', async () => {
    await renderWithProviders(
      <SlotRow slot={booked()} canManage isPast={false} onPress={onPress} />,
    )

    fireEvent.press(screen.getByTestId('agenda-slot-booked-appt-1'))

    expect(onPress).toHaveBeenCalledWith('appt-1')
  })

  /**
   * A cor da borda **é** a situação, e é a única pista dela quando o espaço
   * aperta. Os percentuais são os mesmos que a web escreve como `bg-accent/10`
   * e `/20`; o acento aqui é o padrão, porque o render de teste não veste
   * nenhuma clínica.
   */
  it.each([
    [AppointmentStatus.SCHEDULED, '#2F6F6B1A'],
    [AppointmentStatus.CONFIRMED, '#2F6F6B33'],
    [AppointmentStatus.CANCELLED, '#C14E451A'],
    [AppointmentStatus.COMPLETED, '#2F8A671A'],
    [AppointmentStatus.NO_SHOW, '#B8872A1A'],
  ])('pinta o fundo conforme a situação %s', async (status, fill) => {
    await renderWithProviders(
      <ThemedRow status={status} />,
    )

    expect(screen.getByTestId('agenda-slot-booked-appt-1')).toHaveStyle({ backgroundColor: fill })
  })

  it('mostra a faixa do rótulo', async () => {
    await renderWithProviders(
      <SlotRow
        slot={booked({ label: { id: 'l1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD } })}
        canManage
        isPast={false}
        onPress={onPress}
      />,
    )

    expect(screen.getByTestId('agenda-slot-label-appt-1')).toHaveStyle({
      backgroundColor: '#746A27',
    })
  })

  it('usa a variante escura da faixa no tema escuro', async () => {
    useThemeStore.setState({ mode: 'dark' })

    await renderWithProviders(
      <SlotRow
        slot={booked({ label: { id: 'l1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD } })}
        canManage
        isPast={false}
        onPress={onPress}
      />,
    )

    expect(screen.getByTestId('agenda-slot-label-appt-1')).toHaveStyle({
      backgroundColor: '#CBC076',
    })
  })

  it('sem rótulo não desenha faixa', async () => {
    await renderWithProviders(
      <SlotRow slot={booked()} canManage isPast={false} onPress={onPress} />,
    )

    expect(screen.queryByTestId('agenda-slot-label-appt-1')).toBeNull()
  })

  it('mostra a posição na série quando a consulta é recorrente', async () => {
    await renderWithProviders(
      <SlotRow
        slot={booked({ seriesId: 's1', seriesSequence: 2, seriesTotalOccurrences: 6 })}
        canManage
        isPast={false}
        onPress={onPress}
      />,
    )

    expect(screen.getByTestId('agenda-slot-recurring-appt-1')).toHaveTextContent('2/6')
  })

  // Série sem posição conhecida não vira "null/null" na tela.
  it.each([
    [{ seriesId: 's1', seriesSequence: null, seriesTotalOccurrences: 6 }],
    [{ seriesId: 's1', seriesSequence: 2, seriesTotalOccurrences: null }],
    [{ seriesId: null, seriesSequence: 2, seriesTotalOccurrences: 6 }],
  ])('esconde a posição quando falta algum dado da série', async (overrides) => {
    await renderWithProviders(
      <SlotRow slot={booked(overrides)} canManage isPast={false} onPress={onPress} />,
    )

    expect(screen.queryByTestId('agenda-slot-recurring-appt-1')).toBeNull()
  })
})

function ThemedRow({ status }: { status: AppointmentStatus }) {
  return <SlotRow slot={booked({ status })} canManage isPast={false} onPress={onPress} />
}
