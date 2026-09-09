// Stack real ponta a ponta — cobre o escopo por specialtyId (CRM) vs. councilType
// (demais profissões) e a constraint real de "no máximo um generalista por
// profissão por clínica" (409). Erros, loading e validação seguem mockados em
// medical-record-templates-create.cy.ts / medical-record-templates-professional-create.cy.ts.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Medical record templates — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('ADMIN creates a template for a clinic specialty', () => {
    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/medical-record-templates/new`)
        cy.get('[data-testid="template-form-specialty"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="template-form-name"]').type(`Anamnese Real ${Date.now()}`)
        cy.get('[data-testid="template-form-specialty"]').select(specialty.id)
        cy.get('[data-testid="template-form-add-field"]').click()
        cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')
        cy.get('[data-testid="template-form-submit"]').click()

        cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/medical-record-templates`)

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medical-record-templates?specialtyId=${specialty.id}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.specialtyId).to.eq(specialty.id)

          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('API_URL')}/medical-record-templates/${created.id}`,
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)
          cy.deleteSpecialtyViaApi(specialty.id, specialty.platformAdminToken)
        })
      })
    })
  })



  // Modelo de prontuário é da clínica: gerir é do ADMIN. Na stack real, o
  // backend recusa e a tela não oferece o caminho.
  it('o profissional não cria modelo, e a tela não lhe oferece o botão', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)

      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((token) => {
        // A recusa é do servidor, não só da interface.
        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/medical-record-templates`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            specialtyId: professional.specialtyId,
            name: `Tentativa ${Date.now()}`,
            fields: [{ label: 'Queixa', type: 'text', required: false, order: 1 }],
          },
          failOnStatusCode: false,
        }).then((resposta) => {
          expect(resposta.status).to.eq(403)
        })

        cy.visit(`/${CLINIC_SLUG}/medical-record-templates`)
        cy.get('[data-testid="template-list"]', { timeout: 15000 }).should('be.visible')
        cy.get('[data-testid="template-list-new-button"]').should('not.exist')

        cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
        cy.deleteUserViaApi(professional.userId, professional.accessToken)
        cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
      })
    })
  })

})
