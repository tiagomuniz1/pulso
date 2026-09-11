// Baixar o prontuário em PDF, na stack real.
//
// Dois motivos para este spec existir separado dos outros de prontuário:
//
// 1. **Nenhum spec da casa clica num botão de download.** Os cinco documentos
//    que já saem em PDF são cobertos só por `cy.request` no endpoint, o que
//    prova que a API devolve um PDF e não que a tela consegue pedi-lo. Aqui os
//    dois pontos de entrada são clicados de verdade.
// 2. **O recorte por especialidade.** Abrir e baixar o prontuário do colega da
//    mesma especialidade era 404 até esta mudança, e o diálogo do histórico
//    abria vazio.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

/** Sempre múltiplo de 7: a agenda é criada para o dia da semana de hoje. */
function proximaData(diasAFrente: number): string {
  const d = new Date(Date.now() + diasAFrente * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Um segundo profissional exercendo uma especialidade **já existente**.
 *
 * `cy.seedProfessional()` sempre cria uma especialidade nova, e o que este
 * spec precisa provar é justamente o contrário: dois profissionais na mesma.
 */
function criarColegaNaMesmaEspecialidade(specialtyId: string, adminToken: string) {
  const ts = Date.now()
  const email = `colega.${ts}@e2e.test`
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
        .then(() => ({ email, password })),
    )
}

describe('Prontuário em PDF — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('baixa o PDF pela aba da consulta e o arquivo é um PDF de verdade', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Template PDF ${Date.now()}`,
            fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
          },
          professional.accessToken,
        ).then((template) => {
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
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
            ).then((appointment) => {
              cy.createMedicalRecordViaApi(
                {
                  appointmentId: appointment.id,
                  templateId: template.id,
                  data: { [template.fields[0].key]: 'Dor no peito' },
                },
                professional.accessToken,
              ).then((record) => {
                cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then((token) => {
                  cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
                  cy.get('[data-testid="tab-prontuario"]', { timeout: 10000 }).click()

                  // O clique de verdade: nenhum outro spec da casa exercita
                  // um botão de download.
                  cy.get('[data-testid="medical-record-download-button"]', { timeout: 10000 })
                    .should('be.visible')
                    .click()

                  // O navegador do Cypress não expõe o arquivo salvo, então o
                  // que se prova aqui é que o clique não deixou erro na tela.
                  cy.get('[data-testid="medical-record-download-error"]').should('not.exist')

                  cy.request({
                    method: 'GET',
                    url: `${Cypress.env('API_URL')}/medical-records/${record.id}/pdf`,
                    headers: { Authorization: `Bearer ${token}` },
                    encoding: 'binary',
                  }).then((pdf) => {
                    expect(pdf.headers['content-type']).to.contain('application/pdf')
                    expect(pdf.headers['content-disposition']).to.contain(`prontuario-${record.id}.pdf`)
                    expect(pdf.body.slice(0, 4)).to.eq('%PDF')
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  // O caso que motivou alinhar o `GET /:id` com a listagem. Antes, o histórico
  // do paciente listava o prontuário do colega e clicar nele abria o diálogo
  // vazio — 404, sem erro na tela e sem explicação.
  it('o colega da mesma especialidade abre e baixa o prontuário pelo histórico do paciente', () => {
    cy.seedProfessional().then((autor) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, autor.specialtyId, autor.platformAdminToken)
      cy.seedPatient().then((patient) => {
        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: autor.specialtyId,
            name: `Template Colega ${Date.now()}`,
            fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
          },
          autor.accessToken,
        ).then((template) => {
          const dayOfWeek = DAY_NAMES[new Date().getDay()]

          cy.createScheduleViaApi(
            { professionalId: autor.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
            autor.accessToken,
          ).then(() => {
            cy.createAppointmentViaApi(
              {
                professionalId: autor.professionalId,
                patientId: patient.patientId,
                specialtyId: autor.specialtyId,
                date: proximaData(21),
                startTime: '10:00',
              },
              autor.accessToken,
            ).then((appointment) => {
              cy.createMedicalRecordViaApi(
                {
                  appointmentId: appointment.id,
                  templateId: template.id,
                  data: { [template.fields[0].key]: 'Cefaleia' },
                },
                autor.accessToken,
              ).then((record) => {
                criarColegaNaMesmaEspecialidade(autor.specialtyId, autor.accessToken).then((colega) => {
                  cy.loginAsClinicUser(colega.email, colega.password, CLINIC_SLUG).then((token) => {
                    cy.request({
                      method: 'GET',
                      url: `${Cypress.env('API_URL')}/medical-records/${record.id}`,
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .its('status')
                      .should('eq', 200)

                    cy.request({
                      method: 'GET',
                      url: `${Cypress.env('API_URL')}/medical-records/${record.id}/pdf`,
                      headers: { Authorization: `Bearer ${token}` },
                      encoding: 'binary',
                    }).then((pdf) => {
                      expect(pdf.body.slice(0, 4)).to.eq('%PDF')
                    })

                    // E pela tela: o diálogo do histórico é o segundo ponto de
                    // entrada, e era ele que abria vazio antes desta mudança.
                    cy.visit(`/${CLINIC_SLUG}/patients/${patient.patientId}`)
                    cy.get('[data-testid="history-card"]', { timeout: 10000 }).first().click()
                    cy.get('[data-testid="medical-record-view"]', { timeout: 10000 }).should('be.visible')
                    cy.get(`[data-testid="medical-record-download-button-${record.id}"]`)
                      .should('be.visible')
                      .click()
                    cy.get('[data-testid="record-detail-download-error"]').should('not.exist')
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
