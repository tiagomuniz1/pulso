import { render, screen } from '@testing-library/react'
import { ModalFormActions } from './modal-form-actions'

describe('ModalFormActions', () => {
  it('renders the actions it is given', () => {
    render(
      <ModalFormActions>
        <button type="submit">Salvar</button>
      </ModalFormActions>,
    )

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  // É o `sticky bottom-0` que mantém o botão à mão enquanto o formulário rola
  // dentro do modal; sem ele as ações voltam a cair abaixo da dobra.
  it('sticks to the bottom of the scrolling area, over an opaque background', () => {
    render(
      <ModalFormActions>
        <button type="submit">Salvar</button>
      </ModalFormActions>,
    )

    const barra = screen.getByTestId('modal-form-actions')
    expect(barra).toHaveClass('sticky')
    expect(barra).toHaveClass('bottom-0')
    // Opaco: é o fundo que esconde o conteúdo passando por trás.
    expect(barra).toHaveClass('bg-surface-2')
  })

  it('accepts extra classes for forms with actions on both sides', () => {
    render(
      <ModalFormActions className="justify-between">
        <span>esquerda</span>
        <button type="submit">Salvar</button>
      </ModalFormActions>,
    )

    expect(screen.getByTestId('modal-form-actions')).toHaveClass('justify-between')
  })
})
