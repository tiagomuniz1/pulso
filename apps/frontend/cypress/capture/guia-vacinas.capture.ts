// Captura os prints do capítulo de Vacinas para o guia de onboarding.
//
// Fica FORA de `cypress/e2e/` de propósito: o specPattern é
// `cypress/e2e/**/*.cy.{ts,tsx}`, então isto não entra na suíte. Uma versão
// anterior deste arquivo morava lá dentro e passou a rodar junto com os testes.
//
// Roda contra o ambiente local, com dados fictícios. Nenhum paciente real.
import { CLINIC_SLUG } from '../support/clinic'

// O guia é impresso: os prints têm de ser em tema claro. O tema vem de
// `prefers-color-scheme` (escuro nesta máquina) e persiste em `theme-preference`
// — então precisa ser gravado ANTES de o app carregar, senão o primeiro paint
// já sai escuro.
function visitarClaro(caminho: string) {
  cy.visit(caminho, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'theme-preference',
        JSON.stringify({ state: { theme: 'light' }, version: 0 }),
      )
    },
  })

  // O botão flutuante do TanStack Query Devtools só existe em desenvolvimento —
  // e apareceu como um ícone redondo no canto do primeiro print. Não pode entrar
  // num material que vai para a cliente.
  cy.document().then((doc) => {
    const estilo = doc.createElement('style')
    estilo.innerHTML = '.tsqd-open-btn-container, .tsqd-parent-container { display: none !important; }'
    doc.head.appendChild(estilo)
  })

  // Os 15 prints que já estão no guia foram feitos no ambiente com a marca da
  // cliente. Aqui a clínica é a genérica e o objeto da logo não existe no S3
  // local, então a barra lateral mostraria imagem quebrada — e misturar as duas
  // aparências num material só ficaria visivelmente remendado. A imagem
  // renderizada é trocada na hora da captura: não escreve em storage nenhum.
  cy.readFile('cypress/capture/logo-cliente.png', 'base64', { log: false }).then((b64) => {
    cy.get('aside img, header img').first().then(($img) => {
      $img.attr('src', `data:image/png;base64,${b64}`)
      $img.css({ maxHeight: '40px', width: 'auto', objectFit: 'contain' })
    })
    cy.wait(300)
  })
}

const PACIENTE = 'b617d1d2-78e0-49b6-9b96-ad86ce46fce1' // Theo Monteiro Alves, 21 meses
const CONSULTA = '19d760ec-6529-4218-80df-9805cffe08b6'

// A profissional do seed tem ficha — é quem enxerga "Registrar conduta".
const EMAIL = 'generalista@pulso.center'
const SENHA = '123123123'

describe('Guia — capturas de Vacinas', () => {
  beforeEach(() => {
    cy.viewport(1280, 720)
    cy.clearCookies()
    cy.loginAsClinicUser(EMAIL, SENHA, CLINIC_SLUG)
  })

  it('situacao-vacinal', () => {
    visitarClaro(`/${CLINIC_SLUG}/patients/${PACIENTE}`)
    cy.get('[data-testid="vaccine-status-summary"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-testid="vaccine-status-panel"]').scrollIntoView()
    cy.wait(600)
    cy.screenshot('situacao-vacinal', { capture: 'viewport', overwrite: true })
  })

  it('caderneta', () => {
    visitarClaro(`/${CLINIC_SLUG}/patients/${PACIENTE}`)
    cy.get('[data-testid="vaccination-history"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-testid="vaccination-history"]').scrollIntoView()
    cy.wait(600)
    cy.screenshot('caderneta', { capture: 'viewport', overwrite: true })
  })

  it('conduta', () => {
    visitarClaro(`/${CLINIC_SLUG}/patients/${PACIENTE}`)
    cy.get('[data-testid="vaccine-status-summary"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-testid^="vaccine-decide-"]').first().click()
    cy.get('[data-testid="vaccine-decision-select"]').should('be.visible').select('dispensada')
    cy.get('[data-testid="vaccine-decision-reason"]').type('Contraindicação registrada em consulta')
    cy.wait(400)
    cy.screenshot('conduta', { capture: 'viewport', overwrite: true })
  })

  it('indicacao', () => {
    visitarClaro(`/${CLINIC_SLUG}/appointments/${CONSULTA}`)
    cy.get('[data-testid="tab-vacinas"]', { timeout: 20000 }).click()
    cy.get('[data-testid="vaccine-indication-section"]').should('be.visible')

    // Emite uma indicação antes de capturar: o capítulo fala de emitir, e um
    // print do estado vazio não mostra a funcionalidade.
    cy.get('body').then(($corpo) => {
      if ($corpo.find('[data-testid="vaccine-indication-section-list"]').length === 0) {
        cy.get('[data-testid="vaccine-indication-new-button"]').click()
        cy.get('[data-testid="vaccine-indication-vaccine-select-0"]')
          .find('option')
          .contains('Tríplice viral')
          .then(($opt) => {
            cy.get('[data-testid="vaccine-indication-vaccine-select-0"]').select($opt.val() as string)
          })
        cy.get('[data-testid="vaccine-indication-dose-input-0"]').type('1ª dose')
        cy.get('[data-testid="vaccine-indication-instructions-input-0"]').type(
          'Aplicar em serviço de imunização',
        )
        cy.get('[data-testid="vaccine-indication-submit"]').click()
        cy.get('[data-testid="vaccine-indication-section-list"]', { timeout: 15000 }).should('be.visible')
      }
    })

    // Sem o anel de foco do último clique, que não faz parte da tela em uso.
    cy.get('body').click(5, 5)
    cy.wait(600)
    cy.screenshot('indicacao', { capture: 'viewport', overwrite: true })
  })
})
