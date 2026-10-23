import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { SelectField } from './select-field'

const options = [
  { value: 'a', label: 'Dra. Ana' },
  { value: 'b', label: 'Dr. Yago' },
]

const onChange = jest.fn()

beforeEach(() => onChange.mockClear())

async function open(value: string | null = null) {
  await renderWithProviders(
    <SelectField
      value={value}
      options={options}
      onChange={onChange}
      placeholder="Selecione um profissional"
      testID="sel"
    />,
  )
  fireEvent.press(screen.getByTestId('sel'))
  // O React 19 agenda o estado: sem esperar, o modal ainda não montou.
  await screen.findByTestId('sel-options')
}

describe('SelectField', () => {
  it('mostra o texto de ajuda enquanto nada foi escolhido', async () => {
    await renderWithProviders(
      <SelectField
        value={null}
        options={options}
        onChange={onChange}
        placeholder="Selecione um profissional"
        testID="sel"
      />,
    )

    expect(screen.getByTestId('sel')).toHaveTextContent('Selecione um profissional⌄')
  })

  it('mostra o rótulo da opção escolhida', async () => {
    await renderWithProviders(
      <SelectField
        value="b"
        options={options}
        onChange={onChange}
        placeholder="Selecione"
        testID="sel"
      />,
    )

    expect(screen.getByTestId('sel')).toHaveTextContent('Dr. Yago⌄')
  })

  // A lista fica fechada até alguém pedir: é o que um `<select>` faz.
  it('só mostra as opções depois do toque', async () => {
    await renderWithProviders(
      <SelectField
        value={null}
        options={options}
        onChange={onChange}
        placeholder="Selecione"
        testID="sel"
      />,
    )

    expect(screen.queryByTestId('sel-options')).toBeNull()

    fireEvent.press(screen.getByTestId('sel'))

    expect(await screen.findByTestId('sel-options')).toBeTruthy()
  })

  it('devolve o valor escolhido e fecha', async () => {
    await open()

    fireEvent.press(screen.getByTestId('sel-option-a'))

    expect(onChange).toHaveBeenCalledWith('a')
    await waitFor(() => expect(screen.queryByTestId('sel-options')).toBeNull())
  })

  it('marca a opção atual', async () => {
    await open('b')

    expect(screen.getByTestId('sel-option-b').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('sel-option-a').props.accessibilityState.checked).toBe(false)
  })

  it('fecha ao tocar fora, sem escolher nada', async () => {
    await open()

    fireEvent.press(screen.getByTestId('sel-backdrop'))

    expect(onChange).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('sel-options')).toBeNull())
  })

  // A opção de valor vazio é "Todos os rótulos", e precisa de um testID
  // utilizável — `sel-option-` sozinho não identifica nada.
  it('nomeia a opção de valor vazio', async () => {
    await renderWithProviders(
      <SelectField
        value=""
        options={[{ value: '', label: 'Todos os rótulos' }]}
        onChange={onChange}
        placeholder="Todos os rótulos"
        testID="sel"
      />,
    )
    fireEvent.press(screen.getByTestId('sel'))

    expect(await screen.findByTestId('sel-option-all')).toBeTruthy()
  })

  // O botão físico de voltar do Android fecha a folha. Sem isto, ele fecharia
  // a tela inteira por baixo dela.
  it('fecha com o voltar do sistema', async () => {
    await open()

    fireEvent(screen.getByTestId('sel-options').parent!, 'requestClose')

    await waitFor(() => expect(screen.queryByTestId('sel-options')).toBeNull())
  })
})
