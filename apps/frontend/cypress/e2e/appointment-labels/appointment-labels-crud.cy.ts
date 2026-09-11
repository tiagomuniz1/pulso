// Gestão do catálogo de rótulos. O caminho real está em
// appointment-labels-happy-path-real.cy.ts.

import { visitClinic, CLINIC_ID } from '../../support/clinic'

const mockAdmin = {
  id: 'admin-uuid',
  fullName: 'Admin',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockProfessional = { ...mockAdmin, id: 'prof-uuid', role: 'professional' }

const LABEL_ID = '00000000-0000-4000-a000-000000000001'

const makeLabel = (overrides = {}) => ({
  id: LABEL_ID,
  name: 'Retorno',
  color: 'green',
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
})

function stubList(data: unknown[] = [makeLabel()]) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/appointment-labels*`, {
    statusCode: 200,
    body: { data, total: data.length, page: 1, limit: 50 },
  }).as('getLabels')
}

describe('Rótulos de consulta — gestão', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/pulso/appointment-labels')
    cy.location('pathname', { timeout: 10000 }).should('include', '/login')
  })

  it('shows the empty state when there is no label yet', () => {
    stubList([])
    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get('[data-testid="appointment-label-list-empty"]').should('be.visible')
  })

  it('shows the error state when the listing fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointment-labels*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getLabelsError')
    visitClinic('/appointment-labels', mockAdmin)

    cy.get('[data-testid="appointment-label-list-error"]').should('be.visible')
  })

  it('lists the labels as coloured pills', () => {
    stubList()
    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get(`[data-testid="appointment-label-pill-${LABEL_ID}"]`)
      .should('contain.text', 'Retorno')
      .and('have.attr', 'data-label-color', 'green')
    cy.get(`[data-testid="appointment-label-color-name-${LABEL_ID}"]`).should('contain.text', 'Verde')
  })

  it('creates a label choosing the colour on the grid', () => {
    stubList([])
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointment-labels`, {
      statusCode: 201,
      body: makeLabel({ name: 'Pré-natal', color: 'rose' }),
    }).as('createLabel')

    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get('[data-testid="appointment-label-list-new-button"]').click()
    cy.get('[data-testid="appointment-label-form-name"]').type('Pré-natal')
    cy.get('[data-testid="appointment-label-color-rose"]').click({ force: true })
    // O preview mostra a faixa como ela vai aparecer na agenda.
    cy.get('[data-testid="appointment-label-form-preview-strip"]').should('exist')
    cy.get('[data-testid="appointment-label-form-submit"]').click()

    cy.wait('@createLabel').its('request.body').should('deep.equal', {
      name: 'Pré-natal',
      color: 'rose',
    })
  })

  it('blocks the submit until a colour is chosen', () => {
    stubList([])
    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get('[data-testid="appointment-label-list-new-button"]').click()
    cy.get('[data-testid="appointment-label-form-name"]').type('Sem cor')
    cy.get('[data-testid="appointment-label-form-submit"]').click()

    cy.get('[data-testid="appointment-label-form-color-error"]').should('be.visible')
  })

  // O nome é o que distingue dois rótulos no seletor: repetir tornaria a escolha
  // impossível, e a mensagem precisa dizer que renomear resolve.
  it('explains a duplicate name on 409', () => {
    stubList()
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointment-labels`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict' },
    }).as('createConflict')

    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get('[data-testid="appointment-label-list-new-button"]').click()
    cy.get('[data-testid="appointment-label-form-name"]').type('Retorno')
    cy.get('[data-testid="appointment-label-color-green"]').click({ force: true })
    cy.get('[data-testid="appointment-label-form-submit"]').click()

    cy.wait('@createConflict')
    cy.get('[data-testid="appointment-label-form-error"]').should('contain.text', 'esse nome')
  })

  it('edits an existing label', () => {
    stubList()
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointment-labels/${LABEL_ID}`, {
      statusCode: 200,
      body: makeLabel({ name: 'Retorno rápido' }),
    }).as('updateLabel')

    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get(`[data-testid="appointment-label-edit-${LABEL_ID}"]`).click()
    cy.get('[data-testid="appointment-label-form-name"]').clear().type('Retorno rápido')
    cy.get('[data-testid="appointment-label-form-submit"]').click()

    cy.wait('@updateLabel').its('request.body.name').should('eq', 'Retorno rápido')
  })

  // Desativar é "pare de usar em coisas novas" — diferente de excluir.
  it('deactivates a label without deleting it', () => {
    stubList()
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointment-labels/${LABEL_ID}`, {
      statusCode: 200,
      body: makeLabel({ isActive: false }),
    }).as('toggleLabel')

    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get(`[data-testid="appointment-label-toggle-${LABEL_ID}"]`).click()

    cy.wait('@toggleLabel').its('request.body').should('deep.equal', { isActive: false })
  })

  it('warns what happens to the appointments before deleting', () => {
    stubList()
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/appointment-labels/${LABEL_ID}`, {
      statusCode: 204,
    }).as('deleteLabel')

    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get(`[data-testid="appointment-label-delete-${LABEL_ID}"]`).click()
    cy.get('[data-testid="appointment-label-delete-dialog"]').should(
      'contain.text',
      'ficam sem rótulo na agenda',
    )
    cy.get('[data-testid="appointment-label-delete-dialog-confirm"]').click()

    cy.wait('@deleteLabel')
  })

  it('cancelling the delete keeps the label', () => {
    stubList()
    visitClinic('/appointment-labels', mockAdmin)
    cy.wait('@getLabels')

    cy.get(`[data-testid="appointment-label-delete-${LABEL_ID}"]`).click()
    cy.get('[data-testid="appointment-label-delete-dialog-cancel"]').click()

    cy.get('[data-testid="appointment-label-delete-dialog"]').should('not.exist')
    cy.get(`[data-testid="appointment-label-row-${LABEL_ID}"]`).should('exist')
  })

  // Gerir o catálogo é do ADMIN: um rótulo renomeado muda a agenda de todos.
  it('blocks a professional from the management page', () => {
    stubList()
    visitClinic('/appointment-labels', mockProfessional)

    cy.get('[data-testid="appointment-labels-page-forbidden"]').should('be.visible')
  })
})
