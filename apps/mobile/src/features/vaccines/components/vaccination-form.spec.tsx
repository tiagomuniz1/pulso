import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { IVaccineModel } from '@app/core'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { VaccinationForm } from './vaccination-form'

const vaccines = [{ id: 'v1', name: 'Tríplice viral' }] as IVaccineModel[]

const onSubmit = jest.fn()
const onClose = jest.fn()

beforeEach(() => jest.clearAllMocks())

function render(isSaving = false) {
  return renderWithProviders(
    <VaccinationForm
      patientId="pat-1"
      appointmentId="appt-1"
      vaccines={vaccines}
      isOpen
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )
}

async function type(testID: string, text: string) {
  fireEvent.changeText(await screen.findByTestId(testID), text)
  await waitFor(() => expect(screen.getByTestId(testID).props.value).toBe(text))
}

async function chooseVaccine() {
  fireEvent.press(await screen.findByTestId('vaccination-vaccine'))
  fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
  await waitFor(() =>
    expect(screen.getByTestId('vaccination-vaccine')).toHaveTextContent(/Tríplice viral/),
  )
}

describe('VaccinationForm', () => {
  // A data de hoje é o palpite certo na esmagadora maioria: quem registra
  // está com a paciente na frente.
  it('já vem com a data de hoje', async () => {
    await render()

    const today = new Date()
    const iso = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    expect((await screen.findByTestId('vaccination-applied-at')).props.value).toBe(iso)
  })

  it('manda o mínimo: paciente, vacina e data', async () => {
    await render()
    await chooseVaccine()

    fireEvent.press(screen.getByTestId('vaccination-submit'))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'pat-1', vaccineId: 'v1', doseLabel: '' }),
    )
    const sent = onSubmit.mock.calls[0][0]
    expect(sent.appointmentId).toBeUndefined()
    expect(sent.appliedAtDescription).toBeUndefined()
  })

  /**
   * Aplicada aqui amarra à consulta. Transcrita de fora não: a dose de anos
   * atrás noutro serviço não tem consulta a que se ligar, e é por isso que o
   * `appointment_id` da caderneta é opcional.
   */
  it('marcar "aplicada nesta clínica" troca o local pela consulta', async () => {
    await render()
    await chooseVaccine()
    await type('vaccination-where', 'UBS Centro')

    fireEvent.press(screen.getByTestId('vaccination-at-our-clinic'))
    await waitFor(() => expect(screen.queryByTestId('vaccination-where')).toBeNull())

    fireEvent.press(screen.getByTestId('vaccination-submit'))

    const sent = onSubmit.mock.calls[0][0]
    expect(sent.appointmentId).toBe('appt-1')
    expect(sent.appliedAtOurClinic).toBe(true)
    expect(sent.appliedAtDescription).toBeUndefined()
  })

  it('manda lote, fabricante e observação quando preenchidos', async () => {
    await render()
    await chooseVaccine()
    await type('vaccination-dose', ' 1ª dose ')
    await type('vaccination-applied-at', '2026-01-20')
    await type('vaccination-where', ' UBS Centro ')
    await type('vaccination-lot', ' ABC123 ')
    await type('vaccination-manufacturer', ' Butantan ')
    await type('vaccination-notes', ' Sem reação ')

    fireEvent.press(screen.getByTestId('vaccination-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      patientId: 'pat-1',
      vaccineId: 'v1',
      doseLabel: '1ª dose',
      appliedAt: '2026-01-20',
      appliedAtDescription: 'UBS Centro',
      lotNumber: 'ABC123',
      manufacturer: 'Butantan',
      notes: 'Sem reação',
    })
  })

  // Só espaço é campo vazio com disfarce — não vira chave no corpo.
  it('campo com só espaço não vira chave no corpo', async () => {
    await render()
    await chooseVaccine()
    await type('vaccination-lot', '   ')

    fireEvent.press(screen.getByTestId('vaccination-submit'))

    expect(onSubmit.mock.calls[0][0].lotNumber).toBeUndefined()
  })

  it('recusa sem vacina e some com o aviso depois de escolher', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('vaccination-submit'))
    expect(await screen.findByTestId('vaccination-error')).toHaveTextContent(/Escolha a vacina/)
    expect(onSubmit).not.toHaveBeenCalled()

    await chooseVaccine()
    fireEvent.press(screen.getByTestId('vaccination-submit'))

    await waitFor(() => expect(screen.queryByTestId('vaccination-error')).toBeNull())
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('vaccination-form-close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('desabilita o botão enquanto salva', async () => {
    await render(true)

    expect(await screen.findByTestId('vaccination-submit')).toBeDisabled()
  })
})
