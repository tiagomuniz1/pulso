import { MedicalCertificateType } from '@app/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { AtestadoForm } from './atestado-form'

const onSubmit = jest.fn()
const onClose = jest.fn()

async function open() {
  onSubmit.mockClear()
  onClose.mockClear()
  return renderWithProviders(
    <AtestadoForm
      appointmentId="appt-1"
      isOpen
      isSaving={false}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )
}

async function type(testID: string, value: string) {
  fireEvent.changeText(screen.getByTestId(testID), value)
  await waitFor(() => expect(screen.getByTestId(testID).props.value).toBe(value))
}

describe('AtestadoForm', () => {
  it('abre em afastamento, que é o caso comum', async () => {
    await open()

    expect(screen.getByTestId('atestado-days-off')).toBeTruthy()
  })

  it('emite um afastamento', async () => {
    await open()
    await type('atestado-days-off', '3')
    await type('atestado-start-date', '2026-10-15')
    await type('atestado-cid', 'M54.5')
    await type('atestado-observations', 'Repouso')

    fireEvent.press(screen.getByTestId('atestado-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      type: MedicalCertificateType.LEAVE,
      daysOff: 3,
      startDate: '2026-10-15',
      cidCode: 'M54.5',
      observations: 'Repouso',
    })
  })

  /**
   * Comparecimento é outro documento com o mesmo nome: só confirma que a
   * pessoa esteve ali. Os dias somem porque não existem — e `daysOff` fica
   * ausente, não zero.
   */
  it('comparecimento não pede dias', async () => {
    await open()
    fireEvent.press(screen.getByTestId('atestado-type-attendance'))

    await waitFor(() => expect(screen.queryByTestId('atestado-days-off')).toBeNull())

    fireEvent.press(screen.getByTestId('atestado-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      type: MedicalCertificateType.ATTENDANCE,
    })
  })

  it('recusa afastamento sem dias', async () => {
    await open()

    fireEvent.press(screen.getByTestId('atestado-submit'))

    expect(await screen.findByTestId('atestado-days-off-error')).toHaveTextContent(
      /Informe os dias/,
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // Os opcionais em branco não viram string vazia no documento.
  it('deixa de fora o que não foi preenchido', async () => {
    await open()
    await type('atestado-days-off', '1')

    fireEvent.press(screen.getByTestId('atestado-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      type: MedicalCertificateType.LEAVE,
      daysOff: 1,
    })
  })

  it('fecha pelo X', async () => {
    await open()

    fireEvent.press(screen.getByTestId('atestado-form-close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('fecha ao tocar fora', async () => {
    await open()

    fireEvent.press(screen.getByTestId('atestado-form-backdrop'))

    expect(onClose).toHaveBeenCalled()
  })
})
