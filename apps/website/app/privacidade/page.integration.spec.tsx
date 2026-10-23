import { render, screen } from '@testing-library/react'
import PrivacyPolicyPage from './page'

/**
 * A página existe para a loja e para a LGPD, e é por isso que o teste checa
 * conteúdo e não só que renderiza: uma política sem a seção de exclusão de
 * conta, ou sem dizer que trata dado de saúde, é reprovada na revisão.
 */
describe('Política de Privacidade', () => {
  beforeEach(() => render(<PrivacyPolicyPage />))

  it('diz o que é e quando foi atualizada', () => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Política de Privacidade')
    expect(screen.getByText(/Atualizada em/)).toBeInTheDocument()
  })

  // Dado de saúde é categoria sensível na LGPD; omiti-lo seria a omissão
  // que importa.
  it('declara que trata dado de saúde, e quem responde por ele', () => {
    expect(screen.getByText(/dados de saúde/i)).toBeInTheDocument()
    expect(screen.getByText(/operador/i)).toBeInTheDocument()
  })

  /**
   * A Apple exige um caminho de exclusão de conta para todo app que tenha
   * conta. Aqui a conta é criada pela clínica, o que provavelmente isenta —
   * mas quem decide é o revisor, e a página responde antes de ele perguntar.
   */
  it('explica como pedir exclusão de conta', () => {
    expect(screen.getByRole('heading', { name: /Exclusão de conta/i })).toBeInTheDocument()
    expect(screen.getAllByText(/privacidade@pulso\.center/).length).toBeGreaterThan(0)
  })

  it('lista as permissões que o aplicativo pede, e as que não pede', () => {
    expect(screen.getByText(/Câmera — para registrar imagem clínica/i)).toBeInTheDocument()
    // O "não" vem num <strong>, então o texto do parágrafo está partido
    // entre nós — o casamento é pelo conteúdo do elemento inteiro.
    expect(
      screen.getByText(
        (_content, element) => element?.textContent?.includes('não grava áudio') ?? false,
        { selector: 'p' },
      ),
    ).toBeInTheDocument()
  })

  it('leva de volta ao site', () => {
    expect(screen.getByRole('link', { name: /Voltar ao site/i })).toHaveAttribute('href', '/')
  })
})
