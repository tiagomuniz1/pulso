import { render, screen } from '@testing-library/react'
import { FirstVisitBadge } from './first-visit-badge'

describe('FirstVisitBadge', () => {
  it('mostra o texto curto', () => {
    render(<FirstVisitBadge patientName="Ana Lima" professionalName="Dra. Helena" />)
    expect(screen.getByTestId('first-visit-badge')).toHaveTextContent('Primeira vez')
  })

  // "Primeira vez" sozinho não diz em relação a quê — nem à clínica, nem à
  // especialidade, mas ao profissional. É o `title` que fecha isso.
  it('diz no title de quem é a primeira vez, e com quem', () => {
    render(<FirstVisitBadge patientName="Ana Lima" professionalName="Dra. Helena" />)

    expect(screen.getByTestId('first-visit-badge')).toHaveAttribute(
      'title',
      'Primeira vez que Ana Lima é atendida por Dra. Helena',
    )
  })

  // O raio do tema da clínica varia de 2px a 32px: `rounded-md` faria o selo
  // deixar de parecer um selo em metade das clínicas.
  it('é sempre arredondado por inteiro, não pelo raio do tema', () => {
    render(<FirstVisitBadge patientName="Ana" professionalName="Dra. Helena" />)

    const selo = screen.getByTestId('first-visit-badge')
    expect(selo).toHaveClass('rounded-full')
    expect(selo.className).not.toMatch(/rounded-(sm|md|lg|xl)\b/)
  })

  // `bg-info`, `bg-success` e `bg-warning` não existem no tailwind.config.ts e
  // renderizam sem cor nenhuma — é a dívida de tokens fantasma da casa.
  it('não usa token de cor inexistente', () => {
    render(<FirstVisitBadge patientName="Ana" professionalName="Dra. Helena" />)

    expect(screen.getByTestId('first-visit-badge').className).not.toMatch(
      /\b(bg|text|border)-(info|success|warning|primary|muted|border)\b/,
    )
  })

  it('aceita data-testid próprio', () => {
    render(
      <FirstVisitBadge patientName="Ana" professionalName="Dra. Helena" data-testid="selo-custom" />,
    )
    expect(screen.getByTestId('selo-custom')).toBeInTheDocument()
  })
})
