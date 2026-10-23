import { listMedicationsUseCase, listPrescriptionTemplatesUseCase } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { PrescriptionForm } from './prescription-form'

jest.mock('@app/core/src/features/medications/use-cases/list-medications.use-case')
jest.mock('@app/core/src/features/prescription-templates/use-cases/list-prescription-templates.use-case')

const mockMedications = listMedicationsUseCase as jest.MockedFunction<typeof listMedicationsUseCase>
const mockTemplates = listPrescriptionTemplatesUseCase as jest.MockedFunction<
  typeof listPrescriptionTemplatesUseCase
>

const template = (overrides = {}) =>
  ({
    id: 'tpl-1',
    professionalId: 'prof-1',
    professionalName: 'Dra. Helena',
    name: 'Suplementação pré-natal',
    items: [
      {
        medicationId: 'med-9',
        name: 'Ácido fólico',
        activeIngredient: null,
        dosage: '5mg',
        quantity: '1 caixa',
        instructions: '1 comprimido ao dia',
      },
    ],
    notes: 'Tomar em jejum.',
    isActive: true,
    createdAt: new Date(2026, 9, 20),
    ...overrides,
  }) as never

const onSubmit = jest.fn()
const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockTemplates.mockResolvedValue([])
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

    expect(screen.getByTestId('prescription-items-search')).toBeTruthy()
    expect(screen.queryByTestId('prescription-items-typed')).toBeNull()
  })

  // Só busca quando há o que buscar: uma lista de tudo não ajuda ninguém e
  // custa uma requisição a cada abertura.
  it('não busca nada com a caixa vazia', async () => {
    await open()

    expect(mockMedications).not.toHaveBeenCalled()
  })

  it('busca e adiciona do catálogo', async () => {
    await open()
    await type('prescription-items-search', 'dipirona')

    fireEvent.press(await screen.findByTestId('prescription-items-result-med-1'))

    expect(await screen.findByTestId('prescription-items-item-0')).toHaveTextContent(/Dipirona Real/)
  })

  it('a busca limpa depois de adicionar, para o próximo medicamento', async () => {
    await open()
    await type('prescription-items-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-items-result-med-1'))

    await waitFor(() => expect(screen.getByTestId('prescription-items-search').props.value).toBe(''))
  })

  it('emite com posologia', async () => {
    await open()
    await type('prescription-items-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-items-result-med-1'))
    await screen.findByTestId('prescription-items-item-0')

    await type('prescription-items-dosage-0', '500mg')
    await type('prescription-items-quantity-0', '1 caixa')
    await type('prescription-items-instructions-0', '1 comprimido de 8 em 8 horas')
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
    fireEvent.press(screen.getByTestId('prescription-items-mode-digitar'))
    await screen.findByTestId('prescription-items-typed')

    await type('prescription-items-typed', 'Dipirona sódica 500mg')
    fireEvent.press(screen.getByTestId('prescription-items-add-typed'))

    await screen.findByTestId('prescription-items-item-0')
    await type('prescription-items-instructions-0', '1 cp 8/8h')

    fireEvent.press(screen.getByTestId('prescription-submit'))

    expect(onSubmit).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      items: [{ activeIngredientName: 'Dipirona sódica 500mg', instructions: '1 cp 8/8h' }],
    })
  })

  it('o botão de adicionar digitado só liga com texto', async () => {
    await open()
    fireEvent.press(screen.getByTestId('prescription-items-mode-digitar'))
    await screen.findByTestId('prescription-items-add-typed')

    await waitFor(() =>
      expect(screen.getByTestId('prescription-items-add-typed')).toHaveStyle({ opacity: 0.5 }),
    )
  })

  it('remove um medicamento da lista', async () => {
    await open()
    await type('prescription-items-search', 'dipirona')
    fireEvent.press(await screen.findByTestId('prescription-items-result-med-1'))
    await screen.findByTestId('prescription-items-item-0')

    fireEvent.press(screen.getByTestId('prescription-items-remove-0'))

    await waitFor(() => expect(screen.queryByTestId('prescription-items-item-0')).toBeNull())
  })

  it('recusa receita sem medicamento', async () => {
    await open()

    fireEvent.press(screen.getByTestId('prescription-submit'))

    expect(await screen.findByTestId('prescription-items-search-error')).toHaveTextContent(
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
    await type('prescription-items-search', 'manip')

    expect(await screen.findByTestId('prescription-items-result-med-2')).toHaveTextContent(/Manipulado/)
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
    fireEvent.press(screen.getByTestId('prescription-items-mode-digitar'))
    await screen.findByTestId('prescription-items-typed')

    await type('prescription-items-typed', 'Primeiro')
    fireEvent.press(screen.getByTestId('prescription-items-add-typed'))
    await screen.findByTestId('prescription-items-item-0')

    await type('prescription-items-typed', 'Segundo')
    fireEvent.press(screen.getByTestId('prescription-items-add-typed'))
    await screen.findByTestId('prescription-items-item-1')

    await type('prescription-items-instructions-1', 'Só no segundo')

    expect(screen.getByTestId('prescription-items-instructions-0').props.value).toBe('')
    expect(screen.getByTestId('prescription-items-instructions-1').props.value).toBe('Só no segundo')
  })
})

/**
 * **Partir de um modelo é o motivo de o modelo existir** — ele é o
 * receituário que a pessoa repete no dia a dia. Carregar não emite nada:
 * traz os itens para edição, porque a dose quase sempre muda de paciente
 * para paciente.
 */
describe('PrescriptionForm, a partir de um modelo', () => {
  it('não oferece modelos quando não há nenhum', async () => {
    await open()

    expect(screen.queryByTestId('prescription-templates')).toBeNull()
  })

  // Modelo inativo some da receita, mas continua guardado.
  it('não oferece modelo inativo', async () => {
    mockTemplates.mockResolvedValue([template({ isActive: false })])

    await open()

    await waitFor(() => expect(mockTemplates).toHaveBeenCalled())
    expect(screen.queryByTestId('prescription-template-tpl-1')).toBeNull()
  })

  it('carrega os itens e as observações do modelo', async () => {
    mockTemplates.mockResolvedValue([template()])

    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-tpl-1'))
    })

    expect(screen.getByTestId('prescription-items-item-0')).toHaveTextContent(/Ácido fólico/)
    expect(screen.getByTestId('prescription-items-dosage-0').props.value).toBe('5mg')
    expect(screen.getByTestId('prescription-items-quantity-0').props.value).toBe('1 caixa')
    expect(screen.getByTestId('prescription-notes').props.value).toBe('Tomar em jejum.')
  })

  // Dosagem e quantidade são opcionais no modelo; `null` num `TextInput`
  // controlado o torna não controlado, e aí o campo para de responder.
  it('modelo sem dosagem abre com os campos vazios, não com null', async () => {
    mockTemplates.mockResolvedValue([
      template({
        items: [
          {
            medicationId: null,
            name: 'Dipirona',
            activeIngredient: null,
            dosage: null,
            quantity: null,
            instructions: 'Se dor',
          },
        ],
        notes: null,
      }),
    ])

    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-tpl-1'))
    })

    expect(screen.getByTestId('prescription-items-dosage-0').props.value).toBe('')
    expect(screen.getByTestId('prescription-items-quantity-0').props.value).toBe('')
    expect(screen.getByTestId('prescription-notes').props.value).toBe('')
  })

  /**
   * O que veio do catálogo continua sendo `medicationId`; o que foi
   * digitado volta como princípio ativo. Perder essa distinção quebraria a
   * ligação da receita com a base da ANVISA.
   */
  it('emite mantendo a origem de cada item', async () => {
    mockTemplates.mockResolvedValue([template()])

    await open()
    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-tpl-1'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-submit'))
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            medicationId: 'med-9',
            dosage: '5mg',
            quantity: '1 caixa',
            instructions: '1 comprimido ao dia',
          },
        ],
      }),
    )
  })

  it('o modelo diz quantos medicamentos traz', async () => {
    mockTemplates.mockResolvedValue([template()])

    await open()

    expect(await screen.findByTestId('prescription-template-tpl-1')).toHaveTextContent(
      /1 medicamento/,
    )
  })

  it('com mais de um, o plural', async () => {
    mockTemplates.mockResolvedValue([
      template({
        items: [
          { medicationId: 'a', name: 'A', activeIngredient: null, dosage: null, quantity: null, instructions: 'x' },
          { medicationId: 'b', name: 'B', activeIngredient: null, dosage: null, quantity: null, instructions: 'y' },
        ],
      }),
    ])

    await open()

    expect(await screen.findByTestId('prescription-template-tpl-1')).toHaveTextContent(
      /2 medicamentos/,
    )
  })
})
