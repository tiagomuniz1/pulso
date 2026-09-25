// Sem um import ou export, o TypeScript trata o arquivo como script e as
// constantes de topo passam a dividir o escopo global com as outras specs.
export {}

// Stack real ponta a ponta: o opt-in de notificações por clínica, que é o que
// impede o cron de lembretes de disparar para toda clínica ativa da plataforma.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Clinic notification channels — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('habilita e desabilita o WhatsApp de uma clínica pela UI', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="clinic-notification-channel-section"]', { timeout: 10000 }).should('be.visible')

      // Clínica nasce sem canal nenhum: é o padrão que torna o envio opt-in.
      cy.get('[data-testid="clinic-notification-channel-toggle-whatsapp"]').should('not.be.checked')

      cy.get('[data-testid="clinic-notification-channel-toggle-whatsapp"]').check()
      cy.get('[data-testid="clinic-notification-channel-success"]', { timeout: 10000 }).should('be.visible')

      // Persistiu de verdade, não só no estado do React.
      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/clinics/${clinic.id}/notification-channels`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
      }).then((response) => {
        expect(response.body).to.have.length(1)
        expect(response.body[0].channel).to.eq('whatsapp')
      })

      cy.reload()
      cy.get('[data-testid="clinic-notification-channel-toggle-whatsapp"]', { timeout: 10000 }).should('be.checked')

      cy.get('[data-testid="clinic-notification-channel-toggle-whatsapp"]').uncheck()
      cy.get('[data-testid="clinic-notification-channel-success"]', { timeout: 10000 }).should('be.visible')

      cy.reload()
      cy.get('[data-testid="clinic-notification-channel-toggle-whatsapp"]', { timeout: 10000 }).should('not.be.checked')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/clinics/${clinic.id}/notification-channels`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
      }).then((response) => {
        expect(response.body).to.have.length(0)
        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })
})
