import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { EntitySearch } from './entity-search'

const onSelect = jest.fn()
const onClear = jest.fn()
const onSearch = jest.fn()

function render(props: Partial<React.ComponentProps<typeof EntitySearch>> = {}) {
  return renderWithProviders(
    <EntitySearch
      label="Paciente titular"
      placeholder="Buscar por nome..."
      queryKey="titular"
      selectedLabel={null}
      onSearch={onSearch}
      onSelect={onSelect}
      onClear={onClear}
      testID="search"
      {...props}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  onSearch.mockResolvedValue([{ id: 'pat-9', label: 'Maria Souza', hint: '921.158.628-11' }])
})

describe('EntitySearch', () => {
  /**
   * Busca a partir de dois caracteres, como a web.
   *
   * Com um, a clínica inteira volta — e uma lista de mil nomes não ajuda
   * ninguém a achar a Maria.
   */
  it('não busca com menos de dois caracteres', async () => {
    await render()

    await act(async () => {
      screen.getByTestId('search').props.onChangeText('M')
    })

    await waitFor(() => expect(onSearch).not.toHaveBeenCalled())
  })

  it('busca e mostra as sugestões com a dica', async () => {
    await render()

    await act(async () => {
      screen.getByTestId('search').props.onChangeText('Maria')
    })

    const option = await screen.findByTestId('search-option-pat-9')
    expect(option).toHaveTextContent(/Maria Souza/)
    expect(option).toHaveTextContent(/921\.158\.628-11/)
  })

  it('escolher devolve a opção', async () => {
    await render()
    await act(async () => {
      screen.getByTestId('search').props.onChangeText('Maria')
    })

    fireEvent.press(await screen.findByTestId('search-option-pat-9'))

    expect(onSelect).toHaveBeenCalledWith({
      id: 'pat-9',
      label: 'Maria Souza',
      hint: '921.158.628-11',
    })
  })

  // Nem toda entidade tem segunda linha: o usuário traz e-mail, o titular
  // sem CPF não traz nada — e a linha vazia desalinharia a lista.
  it('opção sem dica não desenha a segunda linha', async () => {
    onSearch.mockResolvedValue([{ id: 'pat-9', label: 'Maria Souza', hint: null }])

    await render()
    await act(async () => {
      screen.getByTestId('search').props.onChangeText('Maria')
    })

    const option = await screen.findByTestId('search-option-pat-9')
    expect(option).toHaveTextContent(/^Maria Souza$/)
  })

  it('diz quando a busca não acha nada', async () => {
    onSearch.mockResolvedValue([])

    await render()
    await act(async () => {
      screen.getByTestId('search').props.onChangeText('zzz')
    })

    expect(await screen.findByTestId('search-empty')).toHaveTextContent(/Nenhum resultado/)
  })

  it('com escolha feita, mostra o escolhido no lugar do campo', async () => {
    await render({ selectedLabel: 'Maria Souza' })

    expect(screen.getByTestId('search-selected')).toHaveTextContent(/Maria Souza/)
    expect(screen.queryByTestId('search-option-pat-9')).toBeNull()
  })

  it('trocar desfaz a escolha', async () => {
    await render({ selectedLabel: 'Maria Souza' })

    fireEvent.press(screen.getByTestId('search-clear'))

    expect(onClear).toHaveBeenCalled()
  })

  it('mostra o erro quando o campo tem um', async () => {
    await render({ error: 'Selecione o paciente titular' })

    expect(screen.getByTestId('search-error')).toHaveTextContent(/Selecione o paciente titular/)
  })

  it('mostra o erro também depois de escolher', async () => {
    await render({ selectedLabel: 'Maria Souza', error: 'Algo deu errado' })

    expect(screen.getByTestId('search-error')).toHaveTextContent(/Algo deu errado/)
  })
})
