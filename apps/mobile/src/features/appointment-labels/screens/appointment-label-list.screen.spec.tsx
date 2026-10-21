import { APPOINTMENT_LABEL_COLOR_HEX, AppointmentLabelColor } from '@app/shared'
import {
  createAppointmentLabelUseCase,
  deleteAppointmentLabelUseCase,
  listAppointmentLabelsUseCase,
  updateAppointmentLabelUseCase,
  type IAppointmentLabelModel,
} from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useThemeStore } from '../../../theme/theme.store'
import { AppointmentLabelListScreen } from './appointment-label-list.screen'

jest.mock('@app/core/src/features/appointment-labels/use-cases/list-appointment-labels.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/create-appointment-label.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/update-appointment-label.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/delete-appointment-label.use-case')

const mockList = listAppointmentLabelsUseCase as jest.MockedFunction<
  typeof listAppointmentLabelsUseCase
>
const mockCreate = createAppointmentLabelUseCase as jest.MockedFunction<
  typeof createAppointmentLabelUseCase
>
const mockUpdate = updateAppointmentLabelUseCase as jest.MockedFunction<
  typeof updateAppointmentLabelUseCase
>
const mockDelete = deleteAppointmentLabelUseCase as jest.MockedFunction<
  typeof deleteAppointmentLabelUseCase
>

const label = (overrides: Partial<IAppointmentLabelModel> = {}): IAppointmentLabelModel =>
  ({
    id: 'lbl-1',
    name: 'Retorno',
    color: AppointmentLabelColor.GREEN,
    isActive: true,
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IAppointmentLabelModel

const page = (data: IAppointmentLabelModel[]) =>
  ({ data, total: data.length, page: 1, limit: 50 }) as never

beforeEach(() => {
  jest.clearAllMocks()
  useThemeStore.setState({ mode: 'light' })
  mockList.mockResolvedValue(page([label()]))
  mockCreate.mockResolvedValue(label())
  mockUpdate.mockResolvedValue(label())
  mockDelete.mockResolvedValue(undefined)
})

describe('AppointmentLabelListScreen', () => {
  it('mostra o rótulo com a cor e a situação', async () => {
    await renderWithProviders(<AppointmentLabelListScreen />)

    const card = await screen.findByTestId('appointment-label-card-lbl-1')
    expect(card).toHaveTextContent(/Retorno/)
    expect(card).toHaveTextContent(/Verde/)
    expect(screen.getByTestId('appointment-label-status-lbl-1')).toHaveTextContent(/^Ativo$/)
  })

  /**
   * Desativado continua na lista de gestão: ele some do seletor da consulta,
   * mas **continua colorindo** as que já o usam, e reativá-lo é o que se
   * vem fazer aqui.
   */
  it('o desativado aparece como inativo', async () => {
    mockList.mockResolvedValue(page([label({ isActive: false })]))

    await renderWithProviders(<AppointmentLabelListScreen />)

    expect(await screen.findByTestId('appointment-label-status-lbl-1')).toHaveTextContent(
      /^Inativo$/,
    )
  })

  /**
   * A amostra ao lado do nome é a faixa que o rótulo pinta na agenda, e
   * cada cor tem duas variantes porque hex não tem modo escuro. No escuro a
   * amostra tem de acompanhar, senão ela some no fundo.
   */
  it.each([
    ['claro', 'light' as const, APPOINTMENT_LABEL_COLOR_HEX.green.light.base],
    ['escuro', 'dark' as const, APPOINTMENT_LABEL_COLOR_HEX.green.dark.base],
  ])('a amostra usa a variante do modo %s', async (_caso, mode, expected) => {
    useThemeStore.setState({ mode })

    await renderWithProviders(<AppointmentLabelListScreen />)

    const swatch = await screen.findByTestId('appointment-label-swatch-lbl-1')
    const flattened = Object.assign({}, ...[swatch.props.style].flat(2))
    expect(flattened.backgroundColor).toBe(expected)
  })

  it('trata carregando', async () => {
    mockList.mockReturnValue(new Promise(() => {}))
    await renderWithProviders(<AppointmentLabelListScreen />)
    expect(screen.getByTestId('appointment-label-list-loading')).toBeTruthy()
  })

  it('trata erro, com nova tentativa', async () => {
    mockList.mockRejectedValueOnce({ status: 500, title: 'x', detail: 'y' })

    await renderWithProviders(<AppointmentLabelListScreen />)
    fireEvent.press(await screen.findByTestId('appointment-label-list-error-retry'))

    expect(await screen.findByTestId('appointment-label-card-lbl-1')).toBeTruthy()
  })

  it('diz quando não há rótulo', async () => {
    mockList.mockResolvedValue(page([]))
    await renderWithProviders(<AppointmentLabelListScreen />)
    expect(await screen.findByTestId('appointment-label-list-empty')).toBeTruthy()
  })

  describe('criar', () => {
    it('cria com nome e cor', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })
      await act(async () => {
        screen.getByTestId('label-sheet-name').props.onChangeText('Encaixe')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-color-bronze'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Encaixe',
          color: AppointmentLabelColor.BRONZE,
        }),
      )
      expect(await screen.findByTestId('appointment-label-list-success')).toHaveTextContent(
        /Encaixe criado/,
      )
    })

    it.each([
      ['nome curto', 'R', 'label-sheet-name-error'],
      ['nome longo', 'a'.repeat(41), 'label-sheet-name-error'],
    ])('recusa %s', async (_caso, name, errorTestID) => {
      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })
      await act(async () => {
        screen.getByTestId('label-sheet-name').props.onChangeText(name)
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-color-bronze'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      expect(mockCreate).not.toHaveBeenCalled()
      expect(screen.getByTestId(errorTestID)).toBeTruthy()
    })

    it('sem cor, não cria', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })
      await act(async () => {
        screen.getByTestId('label-sheet-name').props.onChangeText('Encaixe')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      expect(mockCreate).not.toHaveBeenCalled()
      expect(screen.getByTestId('label-sheet-color-error')).toHaveTextContent(/Escolha uma cor/)
    })

    // Criar não oferece "ativo": um rótulo novo nasce em uso.
    it('criar não oferece a situação', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })

      expect(screen.queryByTestId('label-sheet-active')).toBeNull()
    })

    it('explica o nome repetido', async () => {
      mockCreate.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })
      await act(async () => {
        screen.getByTestId('label-sheet-name').props.onChangeText('Retorno')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-color-bronze'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      expect(await screen.findByTestId('label-sheet-error')).toHaveTextContent(/Já existe um rótulo/)
    })

    it('fechar a folha não cria nada', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)
      await screen.findByTestId('appointment-label-card-lbl-1')

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-list-new'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-backdrop'))
      })

      await waitFor(() => expect(screen.queryByTestId('label-sheet-name')).toBeNull())
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('editar', () => {
    it('abre preenchido e salva', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      await act(async () => {
        fireEvent.press(await screen.findByTestId('appointment-label-edit-lbl-1'))
      })
      expect(screen.getByTestId('label-sheet-name').props.value).toBe('Retorno')

      await act(async () => {
        screen.getByTestId('label-sheet-name').props.onChangeText('Retorno anual')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith('lbl-1', {
          name: 'Retorno anual',
          color: AppointmentLabelColor.GREEN,
          isActive: true,
        }),
      )
      expect(await screen.findByTestId('appointment-label-list-success')).toHaveTextContent(
        /Retorno anual atualizado/,
      )
    })

    /**
     * Desativar e excluir são coisas diferentes: o desativado sai do
     * seletor e continua colorindo o que já o usa.
     */
    it('desativa sem excluir', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      await act(async () => {
        fireEvent.press(await screen.findByTestId('appointment-label-edit-lbl-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-active-active'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith('lbl-1', expect.objectContaining({ isActive: false })),
      )
      expect(mockDelete).not.toHaveBeenCalled()
    })

    /**
     * Abrir a edição de um segundo rótulo tem de trazer **o dele**.
     *
     * A folha guarda o nome no próprio estado, e sem uma chave por rótulo o
     * React reaproveita a instância — o segundo abriria com o nome do
     * primeiro, e salvar renomearia o rótulo errado.
     */
    it('editar outro rótulo abre com os dados dele', async () => {
      mockList.mockResolvedValue(
        page([label(), label({ id: 'lbl-2', name: 'Pré-natal' })]),
      )

      await renderWithProviders(<AppointmentLabelListScreen />)

      await act(async () => {
        fireEvent.press(await screen.findByTestId('appointment-label-edit-lbl-1'))
      })
      expect(screen.getByTestId('label-sheet-name').props.value).toBe('Retorno')

      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-backdrop'))
      })
      await waitFor(() => expect(screen.queryByTestId('label-sheet-name')).toBeNull())

      await act(async () => {
        fireEvent.press(screen.getByTestId('appointment-label-edit-lbl-2'))
      })

      expect(screen.getByTestId('label-sheet-name').props.value).toBe('Pré-natal')
    })

    it('fechar a folha não salva nada', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      await act(async () => {
        fireEvent.press(await screen.findByTestId('appointment-label-edit-lbl-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-backdrop'))
      })

      await waitFor(() => expect(screen.queryByTestId('label-sheet-name')).toBeNull())
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('explica o erro do servidor', async () => {
      mockUpdate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentLabelListScreen />)
      await act(async () => {
        fireEvent.press(await screen.findByTestId('appointment-label-edit-lbl-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('label-sheet-submit'))
      })

      expect(await screen.findByTestId('label-sheet-error')).toHaveTextContent(
        /Não foi possível salvar/,
      )
    })
  })

  describe('excluir', () => {
    /**
     * A mensagem diz o que excluir faz **e** oferece a alternativa: excluído
     * some das consultas que já o usam; desativado só sai de circulação.
     */
    it('avisa a diferença entre excluir e desativar', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      fireEvent.press(await screen.findByTestId('appointment-label-delete-lbl-1'))

      const message = await screen.findByTestId('appointment-label-delete-dialog-message')
      expect(message).toHaveTextContent(/some das consultas que já o usam/)
      expect(message).toHaveTextContent(/desative-o/)
    })

    it('exclui e avisa', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      fireEvent.press(await screen.findByTestId('appointment-label-delete-lbl-1'))
      fireEvent.press(await screen.findByTestId('appointment-label-delete-dialog-confirm'))

      await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('lbl-1'))
      expect(await screen.findByTestId('appointment-label-list-success')).toHaveTextContent(
        /Retorno excluído/,
      )
    })

    it('desistir não exclui', async () => {
      await renderWithProviders(<AppointmentLabelListScreen />)

      fireEvent.press(await screen.findByTestId('appointment-label-delete-lbl-1'))
      fireEvent.press(await screen.findByTestId('appointment-label-delete-dialog-cancel'))

      await waitFor(() =>
        expect(screen.queryByTestId('appointment-label-delete-dialog-message')).toBeNull(),
      )
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('fecha o diálogo quando a exclusão falha', async () => {
      mockDelete.mockRejectedValue({ status: 409, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentLabelListScreen />)
      fireEvent.press(await screen.findByTestId('appointment-label-delete-lbl-1'))
      fireEvent.press(await screen.findByTestId('appointment-label-delete-dialog-confirm'))

      await waitFor(() =>
        expect(screen.queryByTestId('appointment-label-delete-dialog-message')).toBeNull(),
      )
      expect(screen.queryByTestId('appointment-label-list-success')).toBeNull()
    })
  })
})
