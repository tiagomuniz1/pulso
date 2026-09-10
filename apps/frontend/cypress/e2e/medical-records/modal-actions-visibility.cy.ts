// O botão de salvar não pode sumir quando o formulário cresce.
//
// O Modal limita a altura e rola o corpo, mas as ações ficavam dentro da área
// que rola: num prontuário com muitos campos, quem preenchia chegava ao fim da
// tela sem enxergar o "Salvar" e precisava descobrir que havia rolagem.
//
// `should('be.visible')` não serve aqui: o Cypress rola até o elemento antes de
// avaliar, então passaria mesmo com o botão fora da tela. A asserção precisa ser
// sobre a posição real do botão dentro da janela.

import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000031'
const APPT_UUID = '00000000-0000-4000-c000-000000000031'
const SPEC_UUID = '00000000-0000-4000-d000-000000000031'
const TPL_UUID = '00000000-0000-4000-e000-000000000031'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockProfessional = {
  id: PROFESSIONAL_UUID,
  user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockAppointment = {
  id: APPT_UUID,
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
  date: '2099-12-01',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: null,
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  patient: {
    fullName: 'Ana Lima',
    email: 'ana@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
}

/** Um modelo longo o bastante para estourar a altura da janela. */
const templateLongo = {
  id: TPL_UUID,
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  councilType: null,
  name: 'Anamnese completa',
  sections: [],
  fields: Array.from({ length: 30 }, (_, i) => ({
    key: `campo_${i}`,
    label: `Campo número ${i + 1}`,
    type: 'text',
    required: false,
    order: i,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
    sectionKey: null,
  })),
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

/** Falha se o elemento estiver fora da área visível da janela. */
function deveEstarDentroDaJanela(testId: string) {
  cy.get(`[data-testid="${testId}"]`).then(($el) => {
    const rect = $el[0]!.getBoundingClientRect()
    const altura = Cypress.config('viewportHeight')
    expect(
      rect.bottom <= altura && rect.top >= 0,
      `"${testId}" deveria estar visível sem rolar (topo ${Math.round(rect.top)}, base ${Math.round(rect.bottom)}, janela ${altura})`,
    ).to.eq(true)
  })
}

describe('Ações dos modais da consulta', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.stubAppointmentDetailWidgets({
      templates: { data: [templateLongo], total: 1, page: 1, limit: 50 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, {
      statusCode: 200,
      body: mockProfessional,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockProfessional], total: 1, page: 1, limit: 200 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    }).as('getRecord')
  })

  it('mantém o botão de salvar do prontuário à vista num formulário longo', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')

    cy.get('[data-testid="tab-prontuario"]').click()
    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_UUID}"]`).click()
    cy.get('[data-testid="medical-record-form"]').should('exist')

    // Sem rolar nada: o botão precisa estar na tela.
    deveEstarDentroDaJanela('medical-record-form-submit')
  })

  it('mantém o botão à vista mesmo depois de rolar até o fim do formulário', () => {
    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')

    cy.get('[data-testid="tab-prontuario"]').click()
    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_UUID}"]`).click()

    cy.get('[data-testid="dynamic-field-campo_29"]').scrollIntoView()
    deveEstarDentroDaJanela('medical-record-form-submit')
  })
})
