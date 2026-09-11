// O selo de "primeira vez" na stack real, pelo caminho que o profissional usa:
// clicar na consulta da agenda e ler o modal.
//
// O coração da regra é ser **por profissional**, não por clínica: a mesma
// paciente é primeira vez para um e não é para o outro. É o segundo teste.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

/** Múltiplo de 7: a agenda é criada para o dia da semana de hoje. */
function proximaData(diasAFrente: number): string {
  const d = new Date(Date.now() + diasAFrente * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Um segundo profissional na especialidade já existente. */
function criarColega(specialtyId: string, adminToken: string) {
  const ts = Date.now()
  const email = `colega.pv.${ts}@e2e.test`
  const password = 'Password123!'

  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/users`,
      body: { fullName: `Dra. Colega ${ts}`, email, password, role: 'professional' },
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    .then((userResponse) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/professionals`,
          body: {
            userId: userResponse.body.id,
            registrations: [
              { councilType: 'crm', number: String(ts).slice(-6), state: 'SP', isPrimary: true },
            ],
            specialties: [{ specialtyId }],
          },
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        .then((r) => ({ professionalId: r.body.id as string, email, password })),
    )
}

describe('Primeira vez com o profissional — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('a primeira consulta traz o selo e a segunda não', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then(() => {
          const consulta = (startTime: string) =>
            cy.createAppointmentViaApi(
              {
                professionalId: professional.professionalId,
                patientId: patient.patientId,
                specialtyId: professional.specialtyId,
                date: proximaData(14),
                startTime,
              },
              professional.accessToken,
            )

          consulta('09:00').then((primeira) => {
            consulta('10:00').then((segunda) => {
              cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(
                (token) => {
                  cy.request({
                    method: 'GET',
                    url: `${Cypress.env('API_URL')}/appointments/${primeira.id}`,
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .its('body.isFirstVisitWithProfessional')
                    .should('eq', true)

                  cy.request({
                    method: 'GET',
                    url: `${Cypress.env('API_URL')}/appointments/${segunda.id}`,
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .its('body.isFirstVisitWithProfessional')
                    .should('eq', false)

                  // E pela tela: é o modal que abre ao clicar na consulta.
                  cy.visit(`/${CLINIC_SLUG}/appointments/${primeira.id}`)
                  cy.get('[data-testid="appointment-detail-first-visit-badge-desktop"]', {
                    timeout: 10000,
                  })
                    .should('be.visible')
                    .and('contain.text', 'Primeira vez')

                  cy.visit(`/${CLINIC_SLUG}/appointments/${segunda.id}`)
                  cy.get('[data-testid="appointment-detail-status"]', { timeout: 10000 }).should(
                    'be.visible',
                  )
                  cy.get('[data-testid="appointment-detail-first-visit-badge-desktop"]').should(
                    'not.exist',
                  )
                },
              )
            })
          })
        })
      })
    })
  })

  it('a mesma paciente é primeira vez para o outro profissional', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then(() => {
          cy.createAppointmentViaApi(
            {
              professionalId: professional.professionalId,
              patientId: patient.patientId,
              specialtyId: professional.specialtyId,
              date: proximaData(14),
              startTime: '09:00',
            },
            professional.accessToken,
          ).then(() => {
            criarColega(professional.specialtyId, professional.accessToken).then((colega) => {
              cy.createScheduleViaApi(
                {
                  professionalId: colega.professionalId,
                  dayOfWeek,
                  startTime: '08:00',
                  endTime: '18:00',
                  slotDurationInMinutes: 30,
                },
                professional.accessToken,
              ).then(() => {
                cy.createAppointmentViaApi(
                  {
                    professionalId: colega.professionalId,
                    patientId: patient.patientId,
                    specialtyId: professional.specialtyId,
                    date: proximaData(21),
                    startTime: '09:00',
                  },
                  professional.accessToken,
                ).then((comColega) => {
                  cy.loginAsClinicUser(colega.email, colega.password, CLINIC_SLUG).then((token) => {
                    cy.request({
                      method: 'GET',
                      url: `${Cypress.env('API_URL')}/appointments/${comColega.id}`,
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .its('body.isFirstVisitWithProfessional')
                      .should('eq', true)
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
