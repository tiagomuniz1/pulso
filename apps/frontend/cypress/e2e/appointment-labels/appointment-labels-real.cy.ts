// Stack real ponta a ponta. Prova o que só o backend de verdade responde: a
// unicidade de nome por clínica e o rótulo chegando embutido na consulta,
// pintando a agenda sem reload.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Rótulos de consulta — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('o backend recusa dois rótulos com o mesmo nome na clínica', () => {
    cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((adminToken) => {
      const nome = `Rótulo ${Date.now()}`
      const corpo = { name: nome, color: 'green' }
      const url = `${Cypress.env('API_URL')}/appointment-labels`
      const headers = { Authorization: `Bearer ${adminToken}` }

      cy.request({ method: 'POST', url, body: corpo, headers }).then((primeira) => {
        expect(primeira.status).to.eq(201)

        // Mesmo nome: 409.
        cy.request({ method: 'POST', url, body: corpo, headers, failOnStatusCode: false })
          .its('status')
          .should('eq', 409)

        // Caixa diferente é o mesmo nome para quem lê o seletor.
        cy.request({
          method: 'POST',
          url,
          body: { ...corpo, name: nome.toUpperCase() },
          headers,
          failOnStatusCode: false,
        })
          .its('status')
          .should('eq', 409)

        cy.request({ method: 'DELETE', url: `${url}/${primeira.body.id}`, headers })
      })
    })
  })

  it('marcar o rótulo pinta a faixa na agenda sem recarregar a página', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((adminToken) => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/appointment-labels`,
            body: { name: `Retorno ${Date.now()}`, color: 'green' },
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((labelResponse) => {
            const label = labelResponse.body
            const dayOfWeek = DAY_NAMES[new Date().getDay()]

            cy.createScheduleViaApi(
              { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
              professional.accessToken,
            ).then((schedule) => {
              const alvo = new Date(Date.now() + 14 * 86400000)
              const data = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`

              cy.createAppointmentViaApi(
                {
                  professionalId: professional.professionalId,
                  patientId: patient.patientId,
                  specialtyId: professional.specialtyId,
                  date: data,
                  startTime: '09:00',
                },
                professional.accessToken,
              ).then((appointment) => {
                cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(() => {
                  cy.visit(`/${CLINIC_SLUG}/appointments?date=${data}&view=day`)

                  // Antes: consulta sem faixa.
                  cy.get('[data-testid="agenda-slot-booked"]', { timeout: 15000 }).should('exist')
                  cy.get('[data-testid="agenda-slot-label"]').should('not.exist')

                  // Marca pelo diálogo de detalhes, onde a médica já está.
                  cy.get('[data-testid="agenda-slot-booked"]').click()
                  cy.get('[data-testid="details-label-select"]', { timeout: 10000 }).should('be.visible')
                  cy.get('[data-testid="details-label-select"]').select(label.id)

                  // Depois: a faixa aparece sem reload — prova a invalidação.
                  cy.get('[data-testid="modal-backdrop"]').should('exist')
                  cy.get('body').type('{esc}')
                  cy.get('[data-testid="agenda-slot-label"]', { timeout: 10000 })
                    .should('be.visible')
                    .and('have.attr', 'data-label-color', 'green')

                  // Limpeza.
                  cy.request({
                    method: 'PATCH',
                    url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                    headers: { Authorization: `Bearer ${professional.accessToken}` },
                    body: {},
                    failOnStatusCode: false,
                  })
                  cy.request({
                    method: 'DELETE',
                    url: `${Cypress.env('API_URL')}/appointment-labels/${label.id}`,
                    headers: { Authorization: `Bearer ${adminToken}` },
                  })
                  cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
                })
              })
            })
          })
        })
      })
    })
  })
})
