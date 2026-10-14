import { listMedicationsUseCase } from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { PrescriptionForm } from './prescription-form'

jest.mock('@app/core/src/features/medications/use-cases/list-medications.use-case')

const mockMedications = listMedicationsUseCase as jest.MockedFunction<typeof listMedicationsUseCase>

const onSubmit = jest.fn()
const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockMedications.mockResolvedValue({
    data: [{ id: 'med-1', name: 'Dipirona Real', activeIngredient: 'Dipirona sódica' }],
    total: 1,
    page: 1,
    limit: 10,
  } as never)
})

async function open() {
  return renderWithProviders(
    <PrescriptionForm
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

describe('PrescriptionForm', () => {
  it('abre no modo catálogo', async () => {
    await open()

    expect(screen.getByTestId('prescription-search')).toBeTruthy()
    expect(screen.queryByTestId('prescription-typed')).toBeNull()
  })

  // Só busca quando há o que buscar: uma lista de tudo não ajuda ninguém e
  // custa uma requisição a cada abertura.
  it('não busca nada com a caixa vazia', async () => {
    await open()

    expect(mockMedications).not.toHaveBeenCalled()
  })

  it('busca e adiciona do catálogo', async () => {
    await open()
    await type('prescription-search', 'dipirona')

    fireEvent.press(await screen.findByTestId('prescription-result-med-1'))

    expect(await screen.findByTestId('prescription-item-0')).toHaveTextContent(/Dipirona Real/)
  })

  it('a busca limpa depois de adicionar, para o próximo medicamento', async () => {
    await open()
    await type('prescription-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-result-med-1'))

    await waitFor(() => expect(screen.getByTestId('prescription-search').props.value).toBe(''))
  })

  it('emite com posologia', async () => {
    await open()
    await type('prescription-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-result-med-1'))
    await screen.findByTestId('prescription-item-0')

    await type('prescription-dosage-0', '500mg')
    await type('prescription-quantity-0', '1 caixa')
    await type('prescription-instructions-0', '1 comprimido de 8 em 8 horas')
    await type('prescription-notes', 'Se dor')

    fireEvent.press(screen.getByTestId('prescription-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [
        {
          medicationId: 'med-1',
          dosage: '500mg',
          quantity: '1 caixa',
          instructions: '1 comprimido de 8 em 8 horas',
        },
      ],
      notes: 'Se dor',
    })
  })

  /**
   * O modo digitado existe porque a base da ANVISA não tem tudo: manipulado
   * e princípio ativo sem marca ficam de fora, e recusá-los tornaria a
   * receita inútil para metade das prescrições.
   */
  it('aceita princípio ativo digitado', async () => {
    await open()
    fireEvent.press(screen.getByTestId('prescription-mode-digitar'))
    await screen.findByTestId('prescription-typed')

    await type('prescription-typed', 'Dipirona sódica 500mg')
    fireEvent.press(screen.getByTestId('prescription-add-typed'))

    await screen.findByTestId('prescription-item-0')
    await type('prescription-instructions-0', '1 cp 8/8h')

    fireEvent.press(screen.getByTestId('prescription-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ activeIngredientName: 'Dipirona sódica 500mg', instructions: '1 cp 8/8h' }],
    })
  })

  it('o botão de adicionar digitado só liga com texto', async () => {
    await open()
    fireEvent.press(screen.getByTestId('prescription-mode-digitar'))
    await screen.findByTestId('prescription-add-typed')

    await waitFor(() =>
      expect(screen.getByTestId('prescription-add-typed')).toHaveStyle({ opacity: 0.5 }),
    )
  })

  it('remove um medicamento da lista', async () => {
    await open()
    await type('prescription-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-result-med-1'))
    await screen.findByTestId('prescription-item-0')

    fireEvent.press(screen.getByTestId('prescription-remove-0'))

    await waitFor(() => expect(screen.queryByTestId('prescription-item-0')).toBeNull())
  })

  it('recusa receita sem medicamento', async () => {
    await open()

    fireEvent.press(screen.getByTestId('prescription-submit'))

    expect(await screen.findByTestId('prescription-search-error')).toHaveTextContent(
      /ao menos um medicamento/,
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sobrevive a medicamento sem princípio ativo', async () => {
    mockMedications.mockResolvedValue({
      data: [{ id: 'med-2', name: 'Manipulado', activeIngredient: null }],
      total: 1,
      page: 1,
      limit: 10,
    } as never)

    await open()
    await type('prescription-search', 'manip')

    expect(await screen.findByTestId('prescription-result-med-2')).toHaveTextContent(/Manipulado/)
  })

  it('fecha pelo X', async () => {
    await open()

    fireEvent.press(screen.getByTestId('prescription-form-close'))

    expect(onClose).toHaveBeenCalled()
  })

  // O `map` edita só o item tocado; sem isso, digitar a posologia de um
  // medicamento a copiaria para todos.
  it('edita um medicamento sem mexer no outro', async () => {
    await open()
    fireEvent.press(screen.getByTestId('prescription-mode-digitar'))
    await screen.findByTestId('prescription-typed')

    await type('prescription-typed', 'Primeiro')
    fireEvent.press(screen.getByTestId('prescription-add-typed'))
    await screen.findByTestId('prescription-item-0')

    await type('prescription-typed', 'Segundo')
    fireEvent.press(screen.getByTestId('prescription-add-typed'))
    await screen.findByTestId('prescription-item-1')

    await type('prescription-instructions-1', 'Só no segundo')

    expect(screen.getByTestId('prescription-instructions-0').props.value).toBe('')
    expect(screen.getByTestId('prescription-instructions-1').props.value).toBe('Só no segundo')
  })
})
