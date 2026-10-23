import { CouncilType, MedicalRecordFieldType, UserRole } from '@app/shared'
import { deleteTemplateUseCase, getTemplateUseCase, type ITemplateModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { TemplateDetailsScreen } from './template-details.screen'

jest.mock('@app/core/src/features/medical-record-templates/use-cases/get-template.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/delete-template.use-case')

const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'tpl-1' }),
}))

const mockGet = getTemplateUseCase as jest.MockedFunction<typeof getTemplateUseCase>
const mockDelete = deleteTemplateUseCase as jest.MockedFunction<typeof deleteTemplateUseCase>

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
  mockGet.mockResolvedValue(template())
  mockDelete.mockResolvedValue(undefined)
})

describe('TemplateDetailsScreen', () => {
  it('mostra nome, escopo e situação', async () => {
    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-name')).toHaveTextContent('Pré-natal')
    expect(screen.getByTestId('template-details-profession')).toHaveTextContent(/Medicina/)
    expect(screen.getByTestId('template-details-specialty')).toHaveTextContent(/Ginecologia/)
    expect(screen.getByTestId('template-details-status')).toHaveTextContent('Ativo')
  })

  it('o generalista mostra a profissão do conselho', async () => {
    mockGet.mockResolvedValue(
      template({ specialtyId: null, specialtyName: null, councilType: CouncilType.CREFITO }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-profession')).toHaveTextContent(
      /Fisioterapia/,
    )
    expect(screen.getByTestId('template-details-specialty')).toHaveTextContent(/Generalista/)
  })

  it('modelo aposentado aparece como inativo', async () => {
    mockGet.mockResolvedValue(template({ isActive: false }))

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-status')).toHaveTextContent('Inativo')
  })

  it('mostra o campo com o tipo por extenso', async () => {
    mockGet.mockResolvedValue(
      template({ fields: [savedField({ type: MedicalRecordFieldType.TEXTAREA })] }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-field-0')).toHaveTextContent(/Texto longo/)
  })

  it('marca o campo canônico e o obrigatório', async () => {
    mockGet.mockResolvedValue(
      template({ fields: [savedField({ canonical: true, canonicalKey: 'chief_complaint', required: true })] }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    const field = await screen.findByTestId('template-details-field-0')
    expect(field).toHaveTextContent(/Canônico/)
    expect(field).toHaveTextContent(/Obrigatório/)
    expect(field).toHaveTextContent(/chief_complaint/)
  })

  it('lista as opções de um campo de seleção', async () => {
    mockGet.mockResolvedValue(
      template({
        fields: [
          savedField({
            type: MedicalRecordFieldType.SELECT,
            options: [
              { value: 'sim', label: 'Sim' },
              { value: 'nao', label: 'Não' },
            ],
          }),
        ],
      }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    const field = await screen.findByTestId('template-details-field-0')
    expect(field).toHaveTextContent(/Sim/)
    expect(field).toHaveTextContent(/Não/)
  })

  it('mostra os campos de cada seção sob o título dela', async () => {
    mockGet.mockResolvedValue(
      template({
        sections: [{ key: 's1', title: 'Exame físico', order: 0 }],
        fields: [savedField({ key: 'f2', label: 'Ausculta', sectionKey: 's1' })],
      }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-section-title-0')).toHaveTextContent(
      'Exame físico',
    )
    expect(screen.getByTestId('template-details-section-0-field-0')).toHaveTextContent(
      /Ausculta/,
    )
  })

  /**
   * A ordem vem de `order`, não da ordem em que o servidor devolveu —
   * mostrar o formulário fora de ordem é mostrar outro formulário.
   */
  it('respeita a ordem gravada, não a de chegada', async () => {
    mockGet.mockResolvedValue(
      template({
        sections: [
          { key: 's2', title: 'Segunda seção', order: 1 },
          { key: 's1', title: 'Primeira seção', order: 0 },
        ],
        fields: [
          savedField({ key: 'b', label: 'Campo B', order: 1 }),
          savedField({ key: 'a', label: 'Campo A', order: 0 }),
          savedField({ key: 'd', label: 'Na segunda', order: 1, sectionKey: 's2' }),
          savedField({ key: 'c', label: 'Na primeira', order: 0, sectionKey: 's1' }),
        ],
      }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-field-0')).toHaveTextContent(/Campo A/)
    expect(screen.getByTestId('template-details-field-1')).toHaveTextContent(/Campo B/)
    expect(screen.getByTestId('template-details-section-title-0')).toHaveTextContent(
      'Primeira seção',
    )
    expect(screen.getByTestId('template-details-section-0-field-0')).toHaveTextContent(
      /Na primeira/,
    )
  })

  it('a seção vazia diz que está vazia', async () => {
    mockGet.mockResolvedValue(
      template({ sections: [{ key: 's1', title: 'Exame físico', order: 0 }] }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-section-empty-0')).toBeTruthy()
  })

  // `key` é opcional no modelo — um campo sem ela ainda precisa render.
  it('campo sem chave aparece igual', async () => {
    mockGet.mockResolvedValue(
      template({
        sections: [{ key: 's1', title: 'Exame', order: 0 }],
        fields: [
          savedField({ key: undefined, label: 'Sem chave' }),
          savedField({ key: undefined, label: 'Na seção', sectionKey: 's1' }),
        ],
      }),
    )

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-field-0')).toHaveTextContent(/Sem chave/)
    expect(screen.getByTestId('template-details-section-0-field-0')).toHaveTextContent(/Na seção/)
  })

  it('modelo sem campo nenhum diz isso', async () => {
    mockGet.mockResolvedValue(template({ fields: [] }))

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(await screen.findByTestId('template-details-no-fields')).toBeTruthy()
  })

  it('trata carregando', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<TemplateDetailsScreen />)

    expect(screen.getByTestId('template-details-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockGet.mockRejectedValue({ status: 404, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateDetailsScreen />)

    fireEvent.press(await screen.findByTestId('template-details-error-retry'))
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))
  })

  it('volta', async () => {
    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    fireEvent.press(screen.getByTestId('template-details-back'))

    expect(mockBack).toHaveBeenCalled()
  })

  /**
   * **Editar e excluir são do ADMIN.** O modelo é da clínica: mexer nele
   * muda o formulário de todos os colegas da especialidade.
   */
  it('o profissional não edita nem exclui', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    expect(screen.queryByTestId('template-details-edit')).toBeNull()
    expect(screen.queryByTestId('template-details-delete')).toBeNull()
  })

  it('o ADMIN abre a edição', async () => {
    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    fireEvent.press(screen.getByTestId('template-details-edit'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/medical-record-templates/tpl-1/edit')
  })

  /**
   * O diálogo explica o que excluir faz com o que já existe: os
   * prontuários nascidos do modelo continuam íntegros porque o schema fica
   * congelado em cada registro.
   */
  it('exclui pedindo confirmação', async () => {
    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    fireEvent.press(screen.getByTestId('template-details-delete'))

    expect(await screen.findByTestId('template-details-delete-dialog-message')).toHaveTextContent(
      /continuam íntegros/,
    )
    fireEvent.press(screen.getByTestId('template-details-delete-dialog-confirm'))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('tpl-1'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('desistir não exclui', async () => {
    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    fireEvent.press(screen.getByTestId('template-details-delete'))
    fireEvent.press(await screen.findByTestId('template-details-delete-dialog-cancel'))

    await waitFor(() =>
      expect(screen.queryByTestId('template-details-delete-dialog-message')).toBeNull(),
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('explica quando a exclusão falha', async () => {
    mockDelete.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateDetailsScreen />)
    await screen.findByTestId('template-details-name')

    fireEvent.press(screen.getByTestId('template-details-delete'))
    await act(async () => {
      fireEvent.press(await screen.findByTestId('template-details-delete-dialog-confirm'))
    })

    expect(await screen.findByTestId('template-details-delete-error')).toHaveTextContent(
      /Não foi possível excluir/,
    )
    expect(mockBack).not.toHaveBeenCalled()
  })
})
