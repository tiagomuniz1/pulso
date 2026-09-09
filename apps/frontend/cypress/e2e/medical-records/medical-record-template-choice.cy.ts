// A escolha do modelo ao preencher o prontuário. A clínica pode ter vários no
// mesmo escopo — primeira consulta, retorno, pré-natal — e nenhum é padrão, então
// a escolha é explícita toda vez. O caminho real, com dois modelos de verdade no
// banco, está em medical-record-multiple-templates-real.cy.ts.

import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000021'
const APPT_UUID = '00000000-0000-4000-c000-000000000021'
const SPEC_UUID = '00000000-0000-4000-d000-000000000021'
const TPL_ANAMNESE = '00000000-0000-4000-e000-000000000021'
const TPL_RETORNO = '00000000-0000-4000-e000-000000000022'

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
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
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

function makeTemplate(id: string, name: string, fieldKey: string, fieldLabel: string) {
  return {
    id,
    specialtyId: SPEC_UUID,
    specialtyName: 'Cardiologia',
    councilType: null,
    name,
    sections: [],
    fields: [
      {
        key: fieldKey,
        label: fieldLabel,
        type: 'text',
        required: false,
        order: 0,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
        sectionKey: null,
      },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const ANAMNESE = makeTemplate(TPL_ANAMNESE, 'Anamnese completa', 'queixa', 'Queixa')
const RETORNO = makeTemplate(TPL_RETORNO, 'Retorno', 'evolucao', 'Evolução')

function stubTemplates(data: unknown[]) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
    statusCode: 200,
    body: { data, total: data.length, page: 1, limit: 50 },
  }).as('getTemplates')
}

function abrirAbaProntuario() {
  visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
  cy.wait('@getAppointment')
  cy.get('[data-testid="tab-prontuario"]').click()
}

describe('Escolha do modelo de prontuário', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    // Registrado primeiro de propósito: os widgets que este spec não exercita
    // parariam em 401 e jogariam o app num loop de redirect.
    cy.stubAppointmentDetailWidgets()
    // Este spec atua como o profissional DONO da consulta.
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

  it('lista todos os modelos do escopo antes de abrir o formulário', () => {
    stubTemplates([ANAMNESE, RETORNO])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()

    cy.get('[data-testid="medical-record-template-picker"]').should('be.visible')
    cy.get(`[data-testid="template-option-${TPL_ANAMNESE}"]`).should('contain.text', 'Anamnese completa')
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`)
      .should('contain.text', 'Retorno')
      .and('contain.text', '1 campo')
    cy.get('[data-testid="medical-record-form"]').should('not.exist')
  })

  it('mostra os campos do modelo escolhido', () => {
    stubTemplates([ANAMNESE, RETORNO])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`).click()

    cy.get('[data-testid="medical-record-form"]').should('be.visible')
    cy.get('[data-testid="dynamic-field-evolucao"]').should('be.visible')
    cy.get('[data-testid="dynamic-field-queixa"]').should('not.exist')
    cy.get('[data-testid="selected-template-name"]').should('contain.text', 'Retorno')
  })

  // Com um modelo só a escolha continua explícita — foi decisão de produto.
  it('pede escolha mesmo quando só existe um modelo', () => {
    stubTemplates([ANAMNESE])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()

    cy.get('[data-testid="medical-record-template-picker"]').should('be.visible')
    cy.get(`[data-testid="template-option-${TPL_ANAMNESE}"]`).should('be.visible')
  })

  it('sem nenhum modelo não oferece o botão e diz a quem pedir', () => {
    stubTemplates([])
    abrirAbaProntuario()

    cy.wait('@getTemplates')
    cy.get('[data-testid="no-template-empty-state"]')
      .should('be.visible')
      .and('contain.text', 'administrador')
    cy.get('[data-testid="fill-medical-record-button"]').should('not.exist')
  })

  // Falha de leitura não é ausência de modelo: some o botão seria mandar o
  // profissional atrás do administrador por um problema de rede.
  it('falha ao listar mostra erro com nova tentativa, não estado vazio', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getTemplatesError')
    abrirAbaProntuario()

    cy.get('[data-testid="no-template-empty-state"]').should('not.exist')
    cy.get('[data-testid="fill-medical-record-button"]').click()

    cy.get('[data-testid="medical-record-template-picker-error"]').should('be.visible')
    cy.get('[data-testid="medical-record-template-picker-retry"]').should('be.visible')
  })

  it('envia o templateId escolhido ao salvar', () => {
    stubTemplates([ANAMNESE, RETORNO])
    cy.intercept('POST', `${Cypress.env('API_URL')}/medical-records`, {
      statusCode: 201,
      body: {
        id: 'record-uuid',
        appointmentId: APPT_UUID,
        patientId: 'patient-uuid',
        patientName: 'Ana Lima',
        professionalId: PROFESSIONAL_UUID,
        professionalName: 'Dr. João',
        specialtyId: SPEC_UUID,
        specialtyName: 'Cardiologia',
        appointmentDate: '2099-12-01',
        appointmentStartTime: '09:00',
        templateId: TPL_RETORNO,
        templateSchemaSnapshot: RETORNO.fields,
        data: { evolucao: 'Estável' },
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }).as('createRecord')
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`).click()
    cy.get('[data-testid="dynamic-field-evolucao"]').type('Estável')
    cy.get('[data-testid="medical-record-form-submit"]').click()

    cy.wait('@createRecord').its('request.body.templateId').should('eq', TPL_RETORNO)
  })

  it('trocar de modelo com campo preenchido pede confirmação e descarta', () => {
    stubTemplates([ANAMNESE, RETORNO])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_ANAMNESE}"]`).click()
    cy.get('[data-testid="dynamic-field-queixa"]').type('Dor de cabeça')

    cy.get('[data-testid="change-template-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`).click()

    cy.get('[data-testid="change-template-dialog"]').should('be.visible')
    cy.get('[data-testid="change-template-dialog-confirm"]').click()

    cy.get('[data-testid="dynamic-field-evolucao"]').should('be.visible').and('have.value', '')
    cy.get('[data-testid="dynamic-field-queixa"]').should('not.exist')
  })

  it('cancelar a troca preserva o que já foi escrito', () => {
    stubTemplates([ANAMNESE, RETORNO])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_ANAMNESE}"]`).click()
    cy.get('[data-testid="dynamic-field-queixa"]').type('Dor de cabeça')

    cy.get('[data-testid="change-template-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`).click()
    cy.get('[data-testid="change-template-dialog-cancel"]').click()

    cy.get('[data-testid="dynamic-field-queixa"]').should('have.value', 'Dor de cabeça')
  })

  // O listener de Escape do Modal é no document: sem a guarda, um Escape com o
  // diálogo aberto fecharia os dois e levaria junto o texto que o diálogo
  // existe para proteger.
  it('Escape com o diálogo aberto fecha só o diálogo', () => {
    stubTemplates([ANAMNESE, RETORNO])
    abrirAbaProntuario()

    cy.get('[data-testid="fill-medical-record-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_ANAMNESE}"]`).click()
    cy.get('[data-testid="dynamic-field-queixa"]').type('Dor de cabeça')

    cy.get('[data-testid="change-template-button"]').click()
    cy.get(`[data-testid="template-option-${TPL_RETORNO}"]`).click()
    cy.get('[data-testid="change-template-dialog"]').should('be.visible')

    cy.get('body').type('{esc}')

    cy.get('[data-testid="change-template-dialog"]').should('not.exist')
    cy.get('[data-testid="medical-record-form-modal"]').should('be.visible')
    cy.get('[data-testid="dynamic-field-queixa"]').should('have.value', 'Dor de cabeça')
  })
})
