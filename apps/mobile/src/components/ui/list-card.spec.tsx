import { Text } from 'react-native'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../tests/render-with-providers'
import { ListCard, ListCardAction } from './list-card'

describe('ListCard', () => {
  it('mostra título, subtítulo e os pares rótulo/valor', async () => {
    await renderWithProviders(
      <ListCard
        testID="card"
        title="Ana Paula"
        subtitle="ana@pulso.test"
        rows={[
          { label: 'Telefone', value: '(11) 99999-8888' },
          { label: 'Gênero', value: 'Feminino' },
        ]}
      />,
    )

    expect(screen.getByTestId('card-title')).toHaveTextContent(/^Ana Paula$/)
    expect(screen.getByTestId('card-subtitle')).toHaveTextContent(/^ana@pulso\.test$/)
    expect(screen.getByTestId('card')).toHaveTextContent(/Telefone/)
    expect(screen.getByTestId('card')).toHaveTextContent(/\(11\) 99999-8888/)
  })

  it('sem subtítulo, não desenha a linha', async () => {
    await renderWithProviders(<ListCard testID="card" title="Ana" rows={[]} />)

    expect(screen.queryByTestId('card-subtitle')).toBeNull()
  })

  // O valor pode ser um selo ou uma pastilha de cor, não só texto — é como a
  // situação da consulta e a cor do rótulo entram na lista.
  it('aceita um valor desenhado, não só texto', async () => {
    await renderWithProviders(
      <ListCard
        testID="card"
        title="Ana"
        rows={[{ label: 'Situação', value: <Text testID="pill">Ativo</Text> }]}
      />,
    )

    expect(screen.getByTestId('pill')).toBeTruthy()
  })

  // Sem ações o traço de separação não aparece: um cartão de leitura não
  // deve ganhar uma faixa vazia embaixo.
  it('sem ações, não desenha a fileira', async () => {
    await renderWithProviders(<ListCard testID="card" title="Ana" rows={[]} />)

    expect(screen.getByTestId('card')).toBeTruthy()
    expect(screen.queryByTestId('card-action')).toBeNull()
  })

  it('o que vem antes do título é desenhado', async () => {
    await renderWithProviders(
      <ListCard testID="card" title="Ana" rows={[]} leading={<Text testID="avatar">AP</Text>} />,
    )

    expect(screen.getByTestId('avatar')).toBeTruthy()
  })
})

describe('ListCardAction', () => {
  it('chama ao toque', async () => {
    const onPress = jest.fn()
    await renderWithProviders(
      <ListCardAction label="Editar" onPress={onPress} testID="card-action" />,
    )

    fireEvent.press(screen.getByTestId('card-action'))

    expect(onPress).toHaveBeenCalled()
  })

  it('desabilitada não chama', async () => {
    const onPress = jest.fn()
    await renderWithProviders(
      <ListCardAction label="Próxima" onPress={onPress} testID="card-action" disabled />,
    )

    fireEvent.press(screen.getByTestId('card-action'))

    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByTestId('card-action')).toBeDisabled()
  })
})
