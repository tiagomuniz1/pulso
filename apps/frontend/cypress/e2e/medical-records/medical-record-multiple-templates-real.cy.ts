// Stack real ponta a ponta — dois modelos na mesma especialidade, que o banco
// proibia até então. Prova que o prontuário congela o modelo que o profissional
// de fato escolheu, e não um resolvido pelo servidor: era essa divergência entre
// o que a tela mostrava e o que o backend gravava que motivou trafegar o
// templateId. O 409 de nome repetido também só existe contra o índice real.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

describe('Vários modelos por especialidade — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('o prontuário nasce com o modelo escolhido, não com o primeiro da especialidade', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.seedPatient().then((patient) => {
        const carimbo = Date.now()

        cy.createMedicalRecordTemplateViaApi(
          {
            specialtyId: professional.specialtyId,
            name: `Primeira consulta ${carimbo}`,
            fields: [{ label: 'Queixa principal', type: 'text', required: false, order: 0, canonical: false }],
          },
          professional.accessToken,
        ).then((primeira) => {
          // O segundo modelo, no mesmo escopo: é isto que a constraint antiga
          // recusava com 409.
          cy.createMedicalRecordTemplateViaApi(
            {
              specialtyId: professional.specialtyId,
              name: `Retorno ${carimbo}`,
              fields: [{ label: 'Evolução', type: 'text', required: false, order: 0, canonical: false }],
            },
            professional.accessToken,
          ).then((retorno) => {
            const chaveEvolucao = retorno.fields[0].key
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
                cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(
                  (professionalToken) => {
                    cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
                    cy.get('[data-testid="tab-prontuario"]', { timeout: 10000 }).click()
                    cy.get('[data-testid="fill-medical-record-button"]', { timeout: 10000 }).click()

                    // Os dois modelos são oferecidos.
                    cy.get(`[data-testid="template-option-${primeira.id}"]`).should('be.visible')
                    cy.get(`[data-testid="template-option-${retorno.id}"]`).click()

                    cy.get('[data-testid="selected-template-name"]').should('contain.text', 'Retorno')
                    cy.get(`[data-testid="dynamic-field-${chaveEvolucao}"]`).type('Quadro estável')
                    cy.get('[data-testid="medical-record-form-submit"]').click()
                    cy.get('[data-testid="medical-record-form"]').should('not.exist')

                    // O que ficou gravado é o segundo modelo, com o schema dele.
                    cy.request({
                      method: 'GET',
                      url: `${Cypress.env('API_URL')}/medical-records/by-appointment/${appointment.id}`,
                      headers: { Authorization: `Bearer ${professionalToken}` },
                    }).then((resposta) => {
                      expect(resposta.body.templateId).to.eq(retorno.id)
                      expect(resposta.body.templateSchemaSnapshot).to.have.length(1)
                      expect(resposta.body.templateSchemaSnapshot[0].key).to.eq(chaveEvolucao)
                      expect(resposta.body.data[chaveEvolucao]).to.eq('Quadro estável')
                    })

                    // Limpeza: a especialidade é nova a cada execução, mas os
                    // modelos e a consulta não somem sozinhos.
                    cy.request({
                      method: 'PATCH',
                      url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                      headers: { Authorization: `Bearer ${professional.accessToken}` },
                      body: {},
                      failOnStatusCode: false,
                    })
                    cy.deleteMedicalRecordTemplateViaApi(retorno.id, professional.accessToken)
                    cy.deleteMedicalRecordTemplateViaApi(primeira.id, professional.accessToken)
                    cy.deleteScheduleViaApi(schedule.id, professional.accessToken)
                  },
                )
              })
            })
          })
        })
      })
    })
  })

  // O nome é o único discriminador no seletor: dois "Retorno" na mesma
  // especialidade seriam duas linhas idênticas e uma escolha impossível.
  it('o backend recusa dois modelos com o mesmo nome no mesmo escopo', () => {
    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((adminToken) => {
        const nome = `Retorno ${Date.now()}`
        const corpo = {
          specialtyId: specialty.id,
          name: nome,
          fields: [{ label: 'Evolução', type: 'text', required: false, order: 0, canonical: false }],
        }

        cy.request({
          method: 'POST',
          url: `${Cypress.env('API_URL')}/medical-record-templates`,
          body: corpo,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((primeira) => {
          // Mesmo nome: 409.
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/medical-record-templates`,
            body: corpo,
            headers: { Authorization: `Bearer ${adminToken}` },
            failOnStatusCode: false,
          })
            .its('status')
            .should('eq', 409)

          // Nome diferente, mesmo escopo: permitido.
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/medical-record-templates`,
            body: { ...corpo, name: `${nome} bis` },
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((segunda) => {
            expect(segunda.status).to.eq(201)
            cy.deleteMedicalRecordTemplateViaApi(segunda.body.id, adminToken)
          })

          cy.deleteMedicalRecordTemplateViaApi(primeira.body.id, adminToken)
        })
      })
    })
  })
})
