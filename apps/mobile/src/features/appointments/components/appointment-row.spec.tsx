import { useColorScheme } from 'react-native'
import { AppointmentLabelColor, AppointmentStatus } from '@app/shared'
import { screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { AppointmentRow } from './appointment-row'

jest.mock('react-native/Libraries/Utilities/useColorScheme')

const mockScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>

const appointment = {
  id: 'appt-1',
  professionalId: 'doc-1',
  professionalName: 'Dra. Ana',
  patientId: 'pat-1',
  patientName: 'Maria Silva',
  specialtyId: null,
  specialtyName: 'Ginecologia',
  scheduleId: 'sch-1',
  date: '2026-03-10',
  startTime: '09:00:00',
  endTime: '09:30:00',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  label: { id: 'l1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD },
  createdAt: new Date(),
  updatedAt: new Date(),
} as never

/**
 * A paleta de rótulo tem variante escura por um motivo: o mostarda do tema
 * claro (#746A27) sobre fundo escuro some. Sem este teste, o app herdaria só
 * a variante clara e a faixa deixaria de ser legível à noite.
 */
describe('AppointmentRow no tema escuro', () => {
  afterEach(() => mockScheme.mockReset())

  it('uses the dark variant of the label colour', async () => {
    mockScheme.mockReturnValue('dark')

    await renderWithProviders(<AppointmentRow appointment={appointment} onPress={jest.fn()} />)

    expect(screen.getByTestId('appointment-stripe-appt-1')).toHaveStyle({
      backgroundColor: '#CBC076',
    })
  })

  it('uses the light variant otherwise', async () => {
    mockScheme.mockReturnValue('light')

    await renderWithProviders(<AppointmentRow appointment={appointment} onPress={jest.fn()} />)

    expect(screen.getByTestId('appointment-stripe-appt-1')).toHaveStyle({
      backgroundColor: '#746A27',
    })
  })

  // A segunda linha diz o que é a consulta. Sem especialidade — clínico
  // geral, por exemplo — o profissional é a informação que resta.
  it('falls back to the professional when there is no specialty', async () => {
    mockScheme.mockReturnValue('light')

    await renderWithProviders(
      <AppointmentRow
        appointment={{ ...(appointment as object), specialtyName: null } as never}
        onPress={jest.fn()}
      />,
    )

    expect(screen.getByText('Dra. Ana')).toBeTruthy()
  })
})
