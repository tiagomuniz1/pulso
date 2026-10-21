import { UserRole } from '@app/shared'
import {
  createPrescriptionTemplateUseCase,
  deletePrescriptionTemplateUseCase,
  getMyProfessionalUseCase,
  listMedicationsUseCase,
  listPrescriptionTemplatesUseCase,
  updatePrescriptionTemplateUseCase,
  type IPrescriptionTemplateModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { PrescriptionTemplateListScreen } from './prescription-template-list.screen'

jest.mock('@app/core/src/features/prescription-templates/use-cases/list-prescription-templates.use-case')
jest.mock('@app/core/src/features/prescription-templates/use-cases/create-prescription-template.use-case')
jest.mock('@app/core/src/features/prescription-templates/use-cases/update-prescription-template.use-case')
jest.mock('@app/core/src/features/prescription-templates/use-cases/delete-prescription-template.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')
jest.mock('@app/core/src/features/medications/use-cases/list-medications.use-case')

const mockList = listPrescriptionTemplatesUseCase as jest.MockedFunction<
  typeof listPrescriptionTemplatesUseCase
>
const mockCreate = createPrescriptionTemplateUseCase as jest.MockedFunction<
  typeof createPrescriptionTemplateUseCase
>
const mockUpdate = updatePrescriptionTemplateUseCase as jest.MockedFunction<
  typeof updatePrescriptionTemplateUseCase
>
const mockDelete = deletePrescriptionTemplateUseCase as jest.MockedFunction<
  typeof deletePrescriptionTemplateUseCase
>
const mockMine = getMyProfessionalUseCase as jest.MockedFunction<typeof getMyProfessionalUseCase>

const template = (overrides: Partial<IPrescriptionTemplateModel> = {}): IPrescriptionTemplateModel =>
  ({
    id: 'tpl-1',
    professionalId: 'prof-1',
    professionalName: 'Dra. Helena',
    name: 'Suplementação pré-natal',
    items: [
      {
        medicationId: 'med-1',
        name: 'Ácido fólico',
        activeIngredient: null,
        dosage: '5mg',
        quantity: '1 caixa',
        instructions: '1 comprimido ao dia',
      },
    ],
    notes: null,
    isActive: true,
    createdAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IPrescriptionTemplateModel

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u-1', fullName: 'Dra. Helena', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.PROFESSIONAL)
  mockList.mockResolvedValue([template()])
  mockCreate.mockResolvedValue(template())
  mockUpdate.mockResolvedValue(template())
  mockDelete.mockResolvedValue(undefined)
  mockMine.mockResolvedValue({ id: 'prof-1' } as never)
  ;(listMedicationsUseCase as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 })
})

describe('PrescriptionTemplateListScreen', () => {
  it('mostra o modelo com profissional, contagem e situação', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    const card = await screen.findByTestId('prescription-template-card-tpl-1')
    expect(card).toHaveTextContent(/Suplementação pré-natal/)
    expect(card).toHaveTextContent(/Dra\. Helena/)
    expect(card).toHaveTextContent(/1 medicamento/)
    expect(screen.getByTestId('prescription-template-status-tpl-1')).toHaveTextContent(/^Ativo$/)
  })

  it('conta no plural', async () => {
    mockList.mockResolvedValue([template(), template({ id: 'tpl-2' })])

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    expect(await screen.findByTestId('prescription-template-list-header-subtitle')).toHaveTextContent(
      /^2 modelos cadastrados$/,
    )
  })

  it('o cartão conta os medicamentos no plural', async () => {
    mockList.mockResolvedValue([
      template({
        items: [
          { medicationId: 'a', name: 'A', activeIngredient: null, dosage: null, quantity: null, instructions: 'x' },
          { medicationId: 'b', name: 'B', activeIngredient: null, dosage: null, quantity: null, instructions: 'y' },
        ],
      } as never),
    ])

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    expect(await screen.findByTestId('prescription-template-card-tpl-1')).toHaveTextContent(
      /2 medicamentos/,
    )
  })

  it('trata carregando, erro e vazio', async () => {
    mockList.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<PrescriptionTemplateListScreen />)
    expect(screen.getByTestId('prescription-template-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PrescriptionTemplateListScreen />)
    fireEvent.press(await screen.findByTestId('prescription-template-list-error-retry'))

    expect(await screen.findByTestId('prescription-template-card-tpl-1')).toBeTruthy()
  })

  it('diz quando não há modelo', async () => {
    mockList.mockResolvedValue([])
    await renderWithProviders(<PrescriptionTemplateListScreen />)
    expect(await screen.findByTestId('prescription-template-list-empty')).toBeTruthy()
  })

  it('cria um modelo com nome e medicamento digitado', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)
    await screen.findByTestId('prescription-template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-list-new'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-name').props.onChangeText('Pós-operatório')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-items-mode-digitar'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-items-typed').props.onChangeText('Dipirona 500mg')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-items-add-typed'))
    })
    await act(async () => {
      screen
        .getByTestId('prescription-template-items-instructions-0')
        .props.onChangeText('1 comprimido de 6/6h')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Pós-operatório',
        items: [
          { activeIngredientName: 'Dipirona 500mg', instructions: '1 comprimido de 6/6h' },
        ],
      }),
    )
    expect(await screen.findByTestId('prescription-template-list-success')).toHaveTextContent(
      /Pós-operatório criado/,
    )
  })

  it.each([
    ['sem nome', { name: true }, 'prescription-template-name-error'],
    ['sem medicamento', { items: true }, 'prescription-template-items-typed-error'],
  ])('recusa modelo %s', async (_caso, _o, errorTestID) => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)
    await screen.findByTestId('prescription-template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-list-new'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-items-mode-digitar'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByTestId(errorTestID)).toBeTruthy()
  })

  it('edita um modelo, abrindo preenchido', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-edit-tpl-1'))
    })

    expect(screen.getByTestId('prescription-template-name').props.value).toBe(
      'Suplementação pré-natal',
    )
    expect(screen.getByTestId('prescription-template-items-item-0')).toHaveTextContent(
      /Ácido fólico/,
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ isActive: true })),
    )
  })

  // Inativo some da receita, mas continua guardado — é como o profissional
  // aposenta um receituário sem perder o que já emitiu com ele.
  it('desativa sem excluir', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-edit-tpl-1'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-active-active'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ isActive: false })),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('exclui pedindo confirmação', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    fireEvent.press(await screen.findByTestId('prescription-template-delete-tpl-1'))
    expect(await screen.findByTestId('prescription-template-delete-dialog-message')).toHaveTextContent(
      /já emitidas a partir dele não mudam/,
    )
    fireEvent.press(screen.getByTestId('prescription-template-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('tpl-1'))
    expect(await screen.findByTestId('prescription-template-list-success')).toHaveTextContent(
      /excluído com sucesso/,
    )
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    fireEvent.press(await screen.findByTestId('prescription-template-delete-tpl-1'))
    fireEvent.press(await screen.findByTestId('prescription-template-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('prescription-template-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('fecha o diálogo quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<PrescriptionTemplateListScreen />)
    fireEvent.press(await screen.findByTestId('prescription-template-delete-tpl-1'))
    fireEvent.press(await screen.findByTestId('prescription-template-delete-dialog-confirm'))

    await waitFor(() =>
      expect(screen.queryByTestId('prescription-template-delete-dialog-message')).toBeNull(),
    )
    expect(screen.queryByTestId('prescription-template-list-success')).toBeNull()
  })

  it('explica o nome repetido', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<PrescriptionTemplateListScreen />)
    await screen.findByTestId('prescription-template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-list-new'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-name').props.onChangeText('Suplementação pré-natal')
      fireEvent.press(screen.getByTestId('prescription-template-items-mode-digitar'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-items-typed').props.onChangeText('Ácido fólico')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-items-add-typed'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    expect(await screen.findByTestId('prescription-template-error')).toHaveTextContent(
      /Já existe um modelo/,
    )
  })

  it('marca o modelo aposentado como inativo', async () => {
    mockList.mockResolvedValue([template({ isActive: false })])

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    expect(await screen.findByTestId('prescription-template-status-tpl-1')).toHaveTextContent(
      'Inativo',
    )
  })

  it('cria com observações', async () => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)
    await screen.findByTestId('prescription-template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-list-new'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-name').props.onChangeText('Pós-operatório')
      fireEvent.press(screen.getByTestId('prescription-template-items-mode-digitar'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-items-typed').props.onChangeText('Dipirona')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-items-add-typed'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-notes').props.onChangeText('Retorno em 7 dias.')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Retorno em 7 dias.' }),
      ),
    )
  })

  it.each([
    ['criar', 'prescription-template-list-new'],
    ['editar', 'prescription-template-edit-tpl-1'],
  ])('fecha a folha de %s pelo X', async (_caso, openTestID) => {
    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId(openTestID))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-sheet-close'))
    })

    await waitFor(() => expect(screen.queryByTestId('prescription-template-name')).toBeNull())
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // Qualquer outro erro não é nome repetido, e dizer que é mandaria a
  // pessoa renomear um modelo que não tem problema de nome.
  it('erro que não é nome repetido fala de tentar de novo', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-edit-tpl-1'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    expect(await screen.findByTestId('prescription-template-error')).toHaveTextContent(
      /Tente de novo/,
    )
  })

  // Dosagem e quantidade são opcionais no modelo. `null` num `TextInput`
  // controlado o torna não controlado, e o campo para de aceitar digitação.
  it('abre com os campos vazios o item sem dosagem', async () => {
    mockList.mockResolvedValue([
      template({
        items: [
          {
            medicationId: null,
            name: 'Dipirona manipulada',
            activeIngredient: null,
            dosage: null,
            quantity: null,
            instructions: 'Se dor',
          },
        ],
      } as never),
    ])

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-edit-tpl-1'))
    })

    expect(screen.getByTestId('prescription-template-items-dosage-0').props.value).toBe('')
    expect(screen.getByTestId('prescription-template-items-quantity-0').props.value).toBe('')
  })

  /**
   * Item sem `medicationId` volta como princípio ativo digitado — perder
   * essa distinção desligaria o modelo da base da ANVISA.
   */
  it('salva as observações e preserva a origem de cada item', async () => {
    mockList.mockResolvedValue([
      template({
        items: [
          {
            medicationId: null,
            name: 'Dipirona manipulada',
            activeIngredient: null,
            dosage: null,
            quantity: null,
            instructions: 'Se dor',
          },
        ],
      } as never),
    ])

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await act(async () => {
      fireEvent.press(await screen.findByTestId('prescription-template-edit-tpl-1'))
    })
    await act(async () => {
      screen.getByTestId('prescription-template-notes').props.onChangeText('  Tomar em jejum.  ')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('prescription-template-submit'))
    })

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('tpl-1', {
        name: 'Suplementação pré-natal',
        items: [{ activeIngredientName: 'Dipirona manipulada', instructions: 'Se dor' }],
        notes: 'Tomar em jejum.',
        isActive: true,
      }),
    )
  })

  /**
   * **Criar depende da ficha, não do cargo.** Um ADMIN sem ficha é zelador
   * dos modelos da clínica: edita e exclui qualquer um, mas não cria sob a
   * própria ficha — ele não tem uma.
   */
  it('o ADMIN sem ficha não cria, mas gere', async () => {
    asRole(UserRole.ADMIN)
    mockMine.mockResolvedValue(null as never)

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    await screen.findByTestId('prescription-template-card-tpl-1')
    expect(screen.queryByTestId('prescription-template-list-new')).toBeNull()
    expect(screen.getByTestId('prescription-template-list-no-ficha')).toBeTruthy()
    expect(screen.getByTestId('prescription-template-edit-tpl-1')).toBeTruthy()
    expect(screen.getByTestId('prescription-template-delete-tpl-1')).toBeTruthy()
  })

  it('o ADMIN com ficha cria', async () => {
    asRole(UserRole.ADMIN)

    await renderWithProviders(<PrescriptionTemplateListScreen />)

    expect(await screen.findByTestId('prescription-template-list-new')).toBeTruthy()
    expect(screen.queryByTestId('prescription-template-list-no-ficha')).toBeNull()
  })
})
