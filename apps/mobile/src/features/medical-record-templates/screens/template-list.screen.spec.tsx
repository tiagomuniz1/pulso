import { CouncilType, UserRole } from '@app/shared'
import {
  listClinicSpecialtiesUseCase,
  listTemplatesUseCase,
  type ITemplateModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { TemplateListScreen } from './template-list.screen'

jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-templates.use-case')
jest.mock('@app/core/src/features/clinic-specialties/use-cases/list-clinic-specialties.use-case')

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockList = listTemplatesUseCase as jest.MockedFunction<typeof listTemplatesUseCase>
const mockSpecialties = listClinicSpecialtiesUseCase as jest.MockedFunction<
  typeof listClinicSpecialtiesUseCase
>

const template = (overrides: Partial<ITemplateModel> = {}): ITemplateModel =>
  ({
    id: 'tpl-1',
    specialtyId: 'esp-1',
    specialtyName: 'Ginecologia',
    councilType: null,
    name: 'Pré-natal',
    fields: [{ label: 'Queixa' }],
    sections: [],
    isActive: true,
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as ITemplateModel

const page = (data: ITemplateModel[], total = data.length) =>
  ({ data, total, page: 1, limit: 20 }) as never

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Ana', email: 'a@b.c', role, clinicId: 'c1' } as never,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  asRole(UserRole.ADMIN)
  mockList.mockResolvedValue(page([template()]))
  mockSpecialties.mockResolvedValue({
    data: [{ specialtyId: 'esp-1', name: 'Ginecologia' }],
    total: 1,
    page: 1,
    limit: 100,
  } as never)
})

describe('TemplateListScreen', () => {
  it('mostra o modelo com escopo, contagem de campos e situação', async () => {
    await renderWithProviders(<TemplateListScreen />)

    const card = await screen.findByTestId('template-card-tpl-1')
    expect(card).toHaveTextContent(/Pré-natal/)
    expect(card).toHaveTextContent(/Ginecologia/)
    expect(card).toHaveTextContent(/20\/10\/2026/)
    expect(screen.getByTestId('template-status-tpl-1')).toHaveTextContent(/^Ativo$/)
  })

  /**
   * Modelo sem especialidade é o generalista da profissão. Nomeá-lo assim,
   * em vez de exibir um travessão, é o que separa "vale para a profissão
   * inteira" de "faltou preencher".
   */
  it('o generalista aparece pela profissão', async () => {
    mockList.mockResolvedValue(
      page([template({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRN })]),
    )

    await renderWithProviders(<TemplateListScreen />)

    const card = await screen.findByTestId('template-card-tpl-1')
    expect(card).toHaveTextContent(/Nutrição/)
    expect(card).toHaveTextContent(/Generalista/)
  })

  it('marca o modelo aposentado como inativo', async () => {
    mockList.mockResolvedValue(page([template({ isActive: false })]))

    await renderWithProviders(<TemplateListScreen />)

    expect(await screen.findByTestId('template-status-tpl-1')).toHaveTextContent('Inativo')
  })

  it('conta no singular', async () => {
    await renderWithProviders(<TemplateListScreen />)

    expect(await screen.findByTestId('template-list-header-subtitle')).toHaveTextContent(
      /^1 modelo cadastrado$/,
    )
  })

  it('conta no plural', async () => {
    mockList.mockResolvedValue(page([template(), template({ id: 'tpl-2' })], 2))

    await renderWithProviders(<TemplateListScreen />)

    expect(await screen.findByTestId('template-list-header-subtitle')).toHaveTextContent(
      /^2 modelos cadastrados$/,
    )
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<TemplateListScreen />)

    expect(screen.getByTestId('template-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<TemplateListScreen />)

    fireEvent.press(await screen.findByTestId('template-list-error-retry'))
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
  })

  it('diz quando não há modelo', async () => {
    mockList.mockResolvedValue(page([]))

    await renderWithProviders(<TemplateListScreen />)

    expect(await screen.findByTestId('template-list-empty')).toBeTruthy()
  })

  /**
   * **Criar e editar são gestão do ADMIN.** O modelo é da clínica, e mexer
   * nele mudaria o formulário dos colegas da mesma especialidade.
   */
  it('o profissional não cria', async () => {
    asRole(UserRole.PROFESSIONAL)

    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    expect(screen.queryByTestId('template-list-new')).toBeNull()
  })

  it('o ADMIN cria', async () => {
    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    fireEvent.press(screen.getByTestId('template-list-new'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/medical-record-templates/new')
  })

  it('abre os detalhes do modelo', async () => {
    await renderWithProviders(<TemplateListScreen />)

    fireEvent.press(await screen.findByTestId('template-view-tpl-1'))

    expect(mockPush).toHaveBeenCalledWith('/(app)/medical-record-templates/tpl-1')
  })

  it('filtra por especialidade', async () => {
    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-scope'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('template-list-scope-option-esp-1'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ specialtyId: 'esp-1' }),
      ),
    )
  })

  /**
   * O backend trata `councilType` e `specialtyId` como mutuamente
   * exclusivos — o ramo generalista vem primeiro e ignora a especialidade.
   * Por isso o seletor é um só.
   */
  it('filtra pelo generalista de uma profissão, sem mandar especialidade', async () => {
    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-scope'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('template-list-scope-option-generalist:crn'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ councilType: CouncilType.CRN }),
      ),
    )
    expect(mockList).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ specialtyId: expect.anything() }),
    )
  })

  it('volta a todos os escopos sem recorte nenhum', async () => {
    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-scope'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('template-list-scope-option-all'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({ page: 1, limit: 20 }),
    )
  })

  it('pagina para a frente e para trás', async () => {
    mockList.mockResolvedValue(page([template()], 45))

    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    expect(screen.getByTestId('template-list-pagination-info')).toHaveTextContent(
      'Página 1 de 3',
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-pagination-next'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-pagination-prev'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    )
  })

  it('na primeira página não há anterior', async () => {
    mockList.mockResolvedValue(page([template()], 45))

    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    expect(
      screen.getByTestId('template-list-pagination-prev').props.accessibilityState.disabled,
    ).toBe(true)
  })

  it('na última página não há próxima', async () => {
    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    expect(
      screen.getByTestId('template-list-pagination-next').props.accessibilityState.disabled,
    ).toBe(true)
  })

  /**
   * A página 3 do filtro anterior raramente existe no novo — manter o
   * número deixaria a tela vazia num resultado que tem itens.
   */
  it('trocar o filtro volta à primeira página', async () => {
    mockList.mockResolvedValue(page([template()], 45))

    await renderWithProviders(<TemplateListScreen />)
    await screen.findByTestId('template-card-tpl-1')

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-pagination-next'))
    })
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    )

    await act(async () => {
      fireEvent.press(screen.getByTestId('template-list-scope'))
    })
    await act(async () => {
      fireEvent.press(await screen.findByTestId('template-list-scope-option-esp-1'))
    })

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, specialtyId: 'esp-1' }),
      ),
    )
  })
})
