import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { IVaccineModel } from '@app/core'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { VaccineIndicationForm } from './vaccine-indication-form'

const vaccines = [
  { id: 'v1', name: 'Tríplice viral' },
  { id: 'v2', name: 'Hepatite B' },
] as IVaccineModel[]

const onSubmit = jest.fn()
const onClose = jest.fn()

beforeEach(() => jest.clearAllMocks())

function render(isSaving = false) {
  return renderWithProviders(
    <VaccineIndicationForm
      appointmentId="appt-1"
      vaccines={vaccines}
      isOpen
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  )
}

async function choose(index: number, vaccineId: string, label: string) {
  fireEvent.press(await screen.findByTestId(`indication-vaccine-${index}`))
  fireEvent.press(await screen.findByTestId(`indication-vaccine-${index}-option-${vaccineId}`))
  await waitFor(() =>
    expect(screen.getByTestId(`indication-vaccine-${index}`)).toHaveTextContent(
      new RegExp(label),
    ),
  )
}

/** Cada digitação é um setState: esperar o campo refletir evita que a
 *  próxima leia o estado anterior. */
async function type(testID: string, text: string) {
  fireEvent.changeText(await screen.findByTestId(testID), text)
  await waitFor(() => expect(screen.getByTestId(testID).props.value).toBe(text))
}

describe('VaccineIndicationForm', () => {
  it('abre com uma vacina só, e sem botão de remover', async () => {
    await render()

    expect(await screen.findByTestId('indication-vaccine-0')).toBeTruthy()
    expect(screen.queryByTestId('indication-remove-0')).toBeNull()
  })

  it('manda só a vacina quando o resto fica em branco', async () => {
    await render()
    await choose(0, 'v1', 'Tríplice viral')

    fireEvent.press(screen.getByTestId('indication-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ vaccineId: 'v1' }],
    })
  })

  // Dose, orientação e observação são opcionais: em branco não viram chave
  // vazia no corpo, que o `whitelist` do backend recusaria como campo sem
  // valor e o PDF imprimiria como linha vazia.
  it('manda dose, orientação e observação quando preenchidas', async () => {
    await render()
    await choose(0, 'v1', 'Tríplice viral')

    await type('indication-dose-0', '  1ª dose  ')
    await type('indication-instructions-0', 'Em jejum')
    await type('indication-notes', 'Levar caderneta')

    fireEvent.press(screen.getByTestId('indication-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ vaccineId: 'v1', doseLabel: '1ª dose', instructions: 'Em jejum' }],
      notes: 'Levar caderneta',
    })
  })

  /**
   * Dois campos da mesma vacina alterados antes do próximo render — o que o
   * preenchimento automático do teclado faz sozinho. Lendo a lista do render
   * em vez da atual, o segundo apagaria o primeiro.
   */
  it('dois campos alterados de uma vez não se apagam', async () => {
    await render()
    await screen.findByTestId('indication-dose-0')

    // Um `act` só, duas alterações: é o lote que o `fireEvent` em sequência
    // não reproduz — ele abre um `act` por toque, e aí o render do meio já
    // salvou a primeira.
    await act(async () => {
      screen.getByTestId('indication-dose-0').props.onChangeText('1ª dose')
      screen.getByTestId('indication-instructions-0').props.onChangeText('Em jejum')
    })

    expect(screen.getByTestId('indication-dose-0').props.value).toBe('1ª dose')
    expect(screen.getByTestId('indication-instructions-0').props.value).toBe('Em jejum')
  })

  it('indica várias vacinas de uma vez', async () => {
    await render()
    await choose(0, 'v1', 'Tríplice viral')

    fireEvent.press(await screen.findByTestId('indication-add'))
    await screen.findByTestId('indication-vaccine-1')
    await choose(1, 'v2', 'Hepatite B')

    fireEvent.press(screen.getByTestId('indication-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ vaccineId: 'v1' }, { vaccineId: 'v2' }],
    })
  })

  it('remove uma vacina da lista', async () => {
    await render()
    await choose(0, 'v1', 'Tríplice viral')
    fireEvent.press(await screen.findByTestId('indication-add'))
    await screen.findByTestId('indication-remove-1')

    fireEvent.press(screen.getByTestId('indication-remove-1'))

    await waitFor(() => expect(screen.queryByTestId('indication-vaccine-1')).toBeNull())
  })

  // Uma linha em branco entre duas preenchidas é descuido, não intenção de
  // emitir item vazio.
  it('ignora a linha sem vacina escolhida', async () => {
    await render()
    await choose(0, 'v1', 'Tríplice viral')
    fireEvent.press(await screen.findByTestId('indication-add'))
    await screen.findByTestId('indication-vaccine-1')

    fireEvent.press(screen.getByTestId('indication-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ vaccineId: 'v1' }],
    })
  })

  it('recusa sem nenhuma vacina e some com o aviso depois de escolher', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('indication-submit'))
    expect(await screen.findByTestId('indication-error')).toHaveTextContent(
      /Escolha ao menos uma vacina/,
    )
    expect(onSubmit).not.toHaveBeenCalled()

    await choose(0, 'v1', 'Tríplice viral')
    fireEvent.press(screen.getByTestId('indication-submit'))

    await waitFor(() => expect(screen.queryByTestId('indication-error')).toBeNull())
  })

  it('fecha pelo X', async () => {
    await render()

    fireEvent.press(await screen.findByTestId('indication-form-close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('desabilita o botão enquanto salva', async () => {
    await render(true)

    expect(await screen.findByTestId('indication-submit')).toBeDisabled()
  })
})
