import { CouncilType, MedicalRecordFieldType, UserRole } from '@app/shared'
import {
  createTemplateUseCase,
  getMyProfessionalUseCase,
  getTemplateUseCase,
  listCanonicalFieldsUseCase,
  listClinicSpecialtiesUseCase,
  updateTemplateUseCase,
  type ITemplateModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { TemplateCreateScreen } from './template-create.screen'
import { TemplateEditScreen } from './template-edit.screen'

jest.mock('@app/core/src/features/medical-record-templates/use-cases/create-template.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/update-template.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/get-template.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-canonical-fields.use-case')
jest.mock('@app/core/src/features/clinic-specialties/use-cases/list-clinic-specialties.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')

const mockBack = jest.fn()
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({ id: 'tpl-1' }),
}))

const mockCreate = createTemplateUseCase as jest.MockedFunction<typeof createTemplateUseCase>
const mockUpdate = updateTemplateUseCase as jest.MockedFunction<typeof updateTemplateUseCase>
const mockGet = getTemplateUseCase as jest.MockedFunction<typeof getTemplateUseCase>
const mockCanonical = listCanonicalFieldsUseCase as jest.MockedFunction<
  typeof listCanonicalFieldsUseCase
>
const mockSpecialties = listClinicSpecialtiesUseCase as jest.MockedFunction<
  typeof listClinicSpecialtiesUseCase
>
const mockMine = getMyProfessionalUseCase as jest.MockedFunction<typeof getMyProfessionalUseCase>

const savedField = (overrides: Record<string, unknown> = {}) =>
  ({
    key: 'f1',
    label: 'Queixa principal',
    type: MedicalRecordFieldType.TEXT,
    required: false,
    order: 0,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
    sectionKey: null,
    ...overrides,
  }) as never

const template = (overrides: Partial<ITemplateModel> = {}): ITemplateModel =>
  ({
    id: 'tpl-1',
    specialtyId: 'esp-1',
    specialtyName: 'Ginecologia',
    councilType: null,
    name: 'Pré-natal',
    fields: [savedField()],
    sections: [],
    isActive: true,
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as ITemplateModel

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockCreate.mockResolvedValue(template())
  mockUpdate.mockResolvedValue(template())
  mockGet.mockResolvedValue(template())
  mockCanonical.mockResolvedValue([])
  mockMine.mockResolvedValue(null as never)
  mockSpecialties.mockResolvedValue({
    data: [{ specialtyId: 'esp-1', name: 'Ginecologia' }],
    total: 1,
    page: 1,
    limit: 100,
  } as never)
})

async function type(testID: string, value: string) {
  await act(async () => {
    screen.getByTestId(testID).props.onChangeText(value)
  })
}

async function press(testID: string) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID))
  })
}

async function choose(selectTestID: string, optionValue: string) {
  await press(selectTestID)
  await act(async () => {
    fireEvent.press(await screen.findByTestId(`${selectTestID}-option-${optionValue || 'all'}`))
  })
}

describe('TemplateCreateScreen', () => {
  it('cria um modelo de especialidade com um campo', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Anamnese Cardiológica')
    await choose('template-form-specialty', 'esp-1')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Queixa principal')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Anamnese Cardiológica',
        specialtyId: 'esp-1',
        fields: [
          {
            label: 'Queixa principal',
            type: MedicalRecordFieldType.TEXT,
            required: false,
            order: 0,
            options: [],
            placeholder: '',
            helpText: '',
            canonical: false,
            canonicalKey: '',
            sectionKey: '',
          },
        ],
        sections: [],
      }),
    )
  })

  it('leva à tela do modelo recém-criado', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Anamnese')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Queixa')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/(app)/medical-record-templates/tpl-1'),
    )
  })

  /**
   * O backend trata `councilType` e `specialtyId` como mutuamente
   * exclusivos. Sem especialidade escolhida, o modelo é o generalista da
   * profissão.
   */
  it('sem especialidade, nasce generalista da profissão escolhida', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Consulta nutricional')
    await choose('template-form-council-type', CouncilType.CRN)
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Hábitos')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ councilType: CouncilType.CRN }),
      ),
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ specialtyId: expect.anything() }),
    )
  })

  /**
   * Especialidade só existe para Medicina — as demais profissões vão
   * direto ao generalista, e oferecer o seletor fora do CRM proporia uma
   * combinação que o servidor descarta.
   */
  it('o seletor de especialidade some fora da Medicina', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    expect(screen.getByTestId('template-form-specialty')).toBeTruthy()

    await choose('template-form-council-type', CouncilType.CRP)

    expect(screen.queryByTestId('template-form-specialty')).toBeNull()
  })

  // Escolha que não aparece mais na tela não pode continuar indo no corpo.
  it('trocar de profissão descarta a especialidade já escolhida', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await choose('template-form-specialty', 'esp-1')
    await choose('template-form-council-type', CouncilType.CRN)
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({ specialtyId: expect.anything() }),
      ),
    )
  })

  it('voltar para Medicina traz o seletor de especialidade de volta', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await choose('template-form-council-type', CouncilType.CRN)
    expect(screen.queryByTestId('template-form-specialty')).toBeNull()

    await choose('template-form-council-type', CouncilType.CRM)
    expect(screen.getByTestId('template-form-specialty')).toBeTruthy()
  })

  /**
   * **A profissão do profissional vem da ficha dele**, nunca de um
   * seletor: confiar no cliente aqui seria deixá-lo declarar o que o
   * registro no conselho já diz.
   */
  it('o profissional não escolhe profissão — a dele vem do registro', async () => {
    asRole(UserRole.PROFESSIONAL)
    mockMine.mockResolvedValue({
      id: 'prof-1',
      registrations: [{ councilType: CouncilType.CRN, number: '1', state: 'SP', isPrimary: true }],
      specialties: [],
    } as never)

    await renderWithProviders(<TemplateCreateScreen />)
    await waitFor(() => expect(mockMine).toHaveBeenCalled())

    expect(screen.queryByTestId('template-form-council-type')).toBeNull()

    await type('template-form-name', 'Consulta')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ councilType: CouncilType.CRN }),
      ),
    )
  })

  // Sem ficha carregada, CRM é o palpite: é o caso comum, e o seletor de
  // especialidade some sozinho quando a ficha chega dizendo outra coisa.
  it('profissional sem ficha carregada assume Medicina', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Consulta')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ councilType: CouncilType.CRM }),
      ),
    )
  })

  /**
   * O profissional só escolhe entre as **próprias** especialidades: o
   * modelo que ele criar vai para o escopo que ele exerce, e oferecer o
   * catálogo da clínica proporia escopos que o servidor recusa.
   */
  it('o profissional escolhe entre as próprias especialidades', async () => {
    asRole(UserRole.PROFESSIONAL)
    mockMine.mockResolvedValue({
      id: 'prof-1',
      registrations: [{ councilType: CouncilType.CRM, number: '1', state: 'SP', isPrimary: true }],
      specialties: [{ id: 'esp-9', name: 'Cardiologia' }],
    } as never)

    await renderWithProviders(<TemplateCreateScreen />)
    await waitFor(() => expect(mockMine).toHaveBeenCalled())

    await press('template-form-specialty')

    expect(await screen.findByTestId('template-form-specialty-option-esp-9')).toBeTruthy()
    expect(screen.queryByTestId('template-form-specialty-option-esp-1')).toBeNull()
  })

  /**
   * Especialidade só existe para Medicina. Um nutricionista que visse o
   * seletor escolheria um escopo que o servidor recusa.
   */
  it('o profissional fora da Medicina não vê especialidade', async () => {
    asRole(UserRole.PROFESSIONAL)
    mockMine.mockResolvedValue({
      id: 'prof-1',
      registrations: [{ councilType: CouncilType.CRN, number: '1', state: 'SP', isPrimary: true }],
      specialties: [],
    } as never)

    await renderWithProviders(<TemplateCreateScreen />)

    // Esperar a chamada não basta: o seletor some quando a ficha **chega**.
    await waitFor(() => expect(screen.queryByTestId('template-form-specialty')).toBeNull())
  })

  it('o profissional médico vê especialidade', async () => {
    asRole(UserRole.PROFESSIONAL)
    mockMine.mockResolvedValue({
      id: 'prof-1',
      registrations: [{ councilType: CouncilType.CRM, number: '1', state: 'SP', isPrimary: true }],
      specialties: [{ id: 'esp-9', name: 'Cardiologia' }],
    } as never)

    await renderWithProviders(<TemplateCreateScreen />)
    await waitFor(() => expect(mockMine).toHaveBeenCalled())

    expect(screen.getByTestId('template-form-specialty')).toBeTruthy()
  })

  it('recusa modelo sem nome', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    expect(screen.getByTestId('template-form-name-error')).toHaveTextContent(/Mínimo 2/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  /**
   * Um modelo sem campo nenhum é um formulário em branco no atendimento —
   * e o profissional não tem como consertá-lo, porque o modelo é da
   * clínica.
   */
  it('recusa modelo sem campo algum', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Vazio')
    await press('template-form-submit')

    expect(screen.getByTestId('template-form-fields-error')).toHaveTextContent(
      /ao menos um campo/,
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('recusa campo sem rótulo', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await press('template-form-submit')

    expect(screen.getByTestId('field-editor-0-label-error')).toHaveTextContent(/Rótulo/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('a tela vazia explica o que fazer', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    expect(screen.getByTestId('template-form-fields-empty')).toBeTruthy()
  })

  it('cancela voltando', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-cancel')

    expect(mockBack).toHaveBeenCalled()
  })

  it('volta pela barra', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-create-back')

    expect(mockBack).toHaveBeenCalled()
  })

  it('explica o nome repetido no escopo', async () => {
    mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Pré-natal')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    expect(await screen.findByTestId('template-form-error')).toHaveTextContent(/Já existe/)
  })

  it('erro que não é nome repetido fala de tentar de novo', async () => {
    mockCreate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Campo')
    await press('template-form-submit')

    expect(await screen.findByTestId('template-form-error')).toHaveTextContent(/Tente de novo/)
  })
})

describe('TemplateCreateScreen, os campos', () => {
  async function withTwoFields() {
    await renderWithProviders(<TemplateCreateScreen />)
    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Primeiro')
    await press('template-form-add-field')
    await type('field-editor-1-label', 'Segundo')
  }

  it('edita um campo sem mexer no outro', async () => {
    await withTwoFields()

    await type('field-editor-0-placeholder', 'Só no primeiro')

    expect(screen.getByTestId('field-editor-0-placeholder').props.value).toBe('Só no primeiro')
    expect(screen.getByTestId('field-editor-1-placeholder').props.value).toBe('')
  })

  it('a seta sobe o campo de posição', async () => {
    await withTwoFields()

    await press('field-editor-1-move-up')

    expect(screen.getByTestId('field-editor-0-label').props.value).toBe('Segundo')
  })

  it('a seta desce o campo de posição', async () => {
    await withTwoFields()

    await press('field-editor-0-move-down')

    expect(screen.getByTestId('field-editor-0-label').props.value).toBe('Segundo')
  })

  it('o primeiro não sobe e o último não desce', async () => {
    await withTwoFields()

    expect(screen.getByTestId('field-editor-0-move-up').props.accessibilityState.disabled).toBe(
      true,
    )
    expect(
      screen.getByTestId('field-editor-1-move-down').props.accessibilityState.disabled,
    ).toBe(true)
  })

  it('remove um campo', async () => {
    await withTwoFields()

    await press('field-editor-0-remove')

    expect(screen.getByTestId('field-editor-0-label').props.value).toBe('Segundo')
    expect(screen.queryByTestId('field-editor-1')).toBeNull()
  })

  it('o campo obrigatório vai marcado', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Peso')
    await press('field-editor-0-required-required')
    await type('field-editor-0-placeholder', 'kg')
    await type('field-editor-0-help-text', 'Em jejum')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [
            expect.objectContaining({ required: true, placeholder: 'kg', helpText: 'Em jejum' }),
          ],
        }),
      ),
    )
  })

  it('só o campo de seleção pede opções', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-field')
    expect(screen.queryByTestId('field-editor-0-options')).toBeNull()

    await choose('field-editor-0-type', MedicalRecordFieldType.SELECT)

    expect(screen.getByTestId('field-editor-0-options')).toBeTruthy()
    expect(screen.getByTestId('field-editor-0-options-empty')).toBeTruthy()
  })

  it('adiciona e remove opção', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-field')
    await choose('field-editor-0-type', MedicalRecordFieldType.SELECT)
    await press('field-editor-0-option-add')

    expect(screen.getByTestId('field-editor-0-option-row-0')).toBeTruthy()

    await press('field-editor-0-option-remove-0')

    expect(screen.queryByTestId('field-editor-0-option-row-0')).toBeNull()
  })

  it('emite as opções do campo de seleção', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Tabagismo')
    await choose('field-editor-0-type', MedicalRecordFieldType.SELECT)
    await press('field-editor-0-option-add')
    await type('field-editor-0-option-value-0', 'sim')
    await type('field-editor-0-option-label-0', 'Sim')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [
            expect.objectContaining({
              type: MedicalRecordFieldType.SELECT,
              options: [{ value: 'sim', label: 'Sim' }],
            }),
          ],
        }),
      ),
    )
  })

  // O `map` edita só a opção tocada; sem isso, digitar o rótulo de uma
  // o copiaria para todas.
  it('edita uma opção sem mexer na outra', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-field')
    await choose('field-editor-0-type', MedicalRecordFieldType.SELECT)
    await press('field-editor-0-option-add')
    await press('field-editor-0-option-add')
    await type('field-editor-0-option-label-1', 'Só na segunda')

    expect(screen.getByTestId('field-editor-0-option-label-0').props.value).toBe('')
    expect(screen.getByTestId('field-editor-0-option-label-1').props.value).toBe('Só na segunda')
  })

  it('recusa seleção sem opção', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Tabagismo')
    await choose('field-editor-0-type', MedicalRecordFieldType.SELECT)
    await press('template-form-submit')

    expect(screen.getByTestId('field-editor-0-options-error')).toHaveTextContent(
      /ao menos uma opção/,
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('TemplateCreateScreen, as seções', () => {
  it('adiciona seção com campo dentro', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-section')
    await type('section-editor-title-0', 'Exame físico')
    await press('section-editor-add-field-0')
    await type('section-field-editor-0-0-label', 'Ausculta')
    await press('template-form-submit')

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    const payload = mockCreate.mock.calls[0][0]
    expect(payload.sections).toEqual([
      { key: expect.any(String), title: 'Exame físico', order: 0 },
    ])
    expect(payload.fields[0]).toMatchObject({
      label: 'Ausculta',
      sectionKey: payload.sections[0].key,
    })
  })

  it('a seção vazia diz que está vazia', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')

    expect(screen.getByTestId('section-editor-fields-empty-0')).toBeTruthy()
  })

  it('recusa seção sem título', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-section')
    await press('section-editor-add-field-0')
    await type('section-field-editor-0-0-label', 'Campo')
    await press('template-form-submit')

    expect(screen.getByTestId('section-editor-title-0-error')).toHaveTextContent(/Título/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('reordena e remove seções', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')
    await type('section-editor-title-0', 'Primeira')
    await press('template-form-add-section')
    await type('section-editor-title-1', 'Segunda')

    await press('section-editor-move-up-1')
    expect(screen.getByTestId('section-editor-title-0').props.value).toBe('Segunda')

    await press('section-editor-move-down-0')
    expect(screen.getByTestId('section-editor-title-0').props.value).toBe('Primeira')

    await press('section-editor-remove-0')
    expect(screen.getByTestId('section-editor-title-0').props.value).toBe('Segunda')
    expect(screen.queryByTestId('section-editor-1')).toBeNull()
  })

  // Cada seção guarda os próprios campos: adicionar na segunda não pode
  // encostar na primeira.
  it('o campo entra só na seção em que foi adicionado', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')
    await type('section-editor-title-0', 'Primeira')
    await press('template-form-add-section')
    await type('section-editor-title-1', 'Segunda')

    await press('section-editor-add-field-1')
    await type('section-field-editor-1-0-label', 'Só na segunda')

    expect(screen.getByTestId('section-editor-fields-empty-0')).toBeTruthy()
    expect(screen.getByTestId('section-field-editor-1-0-label').props.value).toBe('Só na segunda')
  })

  it('a primeira seção não sobe e a última não desce', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')

    expect(screen.getByTestId('section-editor-move-up-0').props.accessibilityState.disabled).toBe(
      true,
    )
    expect(
      screen.getByTestId('section-editor-move-down-0').props.accessibilityState.disabled,
    ).toBe(true)
  })

  /**
   * Mover entre contêineres é o que a web faz arrastando. Aqui é um
   * seletor "Mover para" — o mesmo que a web já oferecia ao lado da alça,
   * porque arrastar nunca foi o único caminho.
   */
  it('move o campo geral para dentro da seção', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await type('template-form-name', 'Modelo')
    await press('template-form-add-field')
    await type('field-editor-0-label', 'Ausculta')
    await press('template-form-add-section')
    await type('section-editor-title-0', 'Exame físico')

    await press('field-editor-0-move-to')
    const option = await screen.findByText('Exame físico')
    await act(async () => {
      fireEvent.press(option)
    })

    expect(screen.queryByTestId('field-editor-0')).toBeNull()
    expect(screen.getByTestId('section-field-editor-0-0-label').props.value).toBe('Ausculta')
  })

  it('traz o campo da seção de volta para os gerais', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')
    await type('section-editor-title-0', 'Exame físico')
    await press('section-editor-add-field-0')
    await type('section-field-editor-0-0-label', 'Ausculta')

    await press('section-field-editor-0-0-move-to')
    const option = await screen.findByText('Campos gerais')
    await act(async () => {
      fireEvent.press(option)
    })

    expect(screen.getByTestId('field-editor-0-label').props.value).toBe('Ausculta')
    expect(screen.getByTestId('section-editor-fields-empty-0')).toBeTruthy()
  })

  it('reordena e remove campos dentro da seção', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-section')
    await type('section-editor-title-0', 'Exame físico')
    await press('section-editor-add-field-0')
    await type('section-field-editor-0-0-label', 'Primeiro')
    await press('section-editor-add-field-0')
    await type('section-field-editor-0-1-label', 'Segundo')

    await press('section-field-editor-0-1-move-up')
    expect(screen.getByTestId('section-field-editor-0-0-label').props.value).toBe('Segundo')

    await press('section-field-editor-0-0-move-down')
    expect(screen.getByTestId('section-field-editor-0-0-label').props.value).toBe('Primeiro')

    await press('section-field-editor-0-0-remove')
    expect(screen.getByTestId('section-field-editor-0-0-label').props.value).toBe('Segundo')
    expect(screen.queryByTestId('section-field-editor-0-1')).toBeNull()
  })

  // Sem seção nenhuma não há para onde mover, e um seletor vazio é um
  // controle que não faz nada.
  it('sem seção, não há "mover para"', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    await press('template-form-add-field')

    expect(screen.queryByTestId('field-editor-0-move-to')).toBeNull()
  })
})

describe('TemplateCreateScreen, os campos canônicos', () => {
  it('adota um campo do catálogo', async () => {
    mockCanonical.mockResolvedValue([
      {
        id: 'c1',
        canonicalKey: 'chief_complaint',
        label: 'Queixa principal',
        type: MedicalRecordFieldType.TEXTAREA,
        options: null,
        unit: null,
        description: null,
      },
    ])

    await renderWithProviders(<TemplateCreateScreen />)
    await type('template-form-name', 'Modelo')

    await act(async () => {
      fireEvent.press(await screen.findByTestId('canonical-field-picker-adopt-c1'))
    })
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [
            expect.objectContaining({
              label: 'Queixa principal',
              type: MedicalRecordFieldType.TEXTAREA,
              canonical: true,
              canonicalKey: 'chief_complaint',
            }),
          ],
        }),
      ),
    )
  })

  it('trata carregando o catálogo', async () => {
    mockCanonical.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<TemplateCreateScreen />)

    expect(screen.getByTestId('canonical-field-picker-loading')).toBeTruthy()
  })

  it('trata erro do catálogo', async () => {
    mockCanonical.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateCreateScreen />)

    expect(await screen.findByTestId('canonical-field-picker-error')).toBeTruthy()
  })

  it('diz quando o catálogo está vazio', async () => {
    await renderWithProviders(<TemplateCreateScreen />)

    expect(await screen.findByTestId('canonical-field-picker-empty')).toBeTruthy()
  })
})

describe('TemplateEditScreen', () => {
  it('abre preenchido com o que estava gravado', async () => {
    mockGet.mockResolvedValue(
      template({
        fields: [savedField({ label: 'Queixa', placeholder: 'descreva', helpText: 'dica' })],
      }),
    )

    await renderWithProviders(<TemplateEditScreen />)

    expect((await screen.findByTestId('template-form-name')).props.value).toBe('Pré-natal')
    expect(screen.getByTestId('field-editor-0-label').props.value).toBe('Queixa')
    expect(screen.getByTestId('field-editor-0-placeholder').props.value).toBe('descreva')
    expect(screen.getByTestId('field-editor-0-help-text').props.value).toBe('dica')
  })

  /**
   * **Escopo não se edita.** Mudar a especialidade de um modelo que já tem
   * prontuários mudaria a quem eles pertencem — o backend não aceita, e o
   * formulário nem oferece.
   */
  it('não oferece trocar o escopo', async () => {
    await renderWithProviders(<TemplateEditScreen />)
    await screen.findByTestId('template-form-name')

    expect(screen.queryByTestId('template-form-specialty')).toBeNull()
    expect(screen.queryByTestId('template-form-council-type')).toBeNull()
  })

  it('salva nome, campos e seções, sem escopo', async () => {
    await renderWithProviders(<TemplateEditScreen />)
    await screen.findByTestId('template-form-name')

    await type('template-form-name', 'Pré-natal revisado')
    await press('template-form-submit')

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('tpl-1', {
        name: 'Pré-natal revisado',
        fields: [expect.objectContaining({ key: 'f1', label: 'Queixa principal' })],
        sections: [],
      }),
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('a seção gravada volta com os campos dela', async () => {
    mockGet.mockResolvedValue(
      template({
        sections: [{ key: 's1', title: 'Exame físico', order: 0 }],
        fields: [savedField({ key: 'f2', label: 'Ausculta', sectionKey: 's1' })],
      }),
    )

    await renderWithProviders(<TemplateEditScreen />)

    expect((await screen.findByTestId('section-editor-title-0')).props.value).toBe('Exame físico')
    expect(screen.getByTestId('section-field-editor-0-0-label').props.value).toBe('Ausculta')
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<TemplateEditScreen />)

    expect(screen.getByTestId('template-edit-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValue({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateEditScreen />)

    fireEvent.press(await screen.findByTestId('template-edit-error-retry'))
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
  })

  it('volta pela barra', async () => {
    await renderWithProviders(<TemplateEditScreen />)
    await screen.findByTestId('template-form-name')

    await press('template-edit-back')

    expect(mockBack).toHaveBeenCalled()
  })

  it('cancela a edição voltando', async () => {
    await renderWithProviders(<TemplateEditScreen />)
    await screen.findByTestId('template-form-name')

    await press('template-form-cancel')

    expect(mockBack).toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('explica a falha ao salvar', async () => {
    mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateEditScreen />)
    await screen.findByTestId('template-form-name')

    await press('template-form-submit')

    expect(await screen.findByTestId('template-form-error')).toHaveTextContent(/Tente de novo/)
  })
})
