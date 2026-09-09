import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

const MOCK_TEMPLATE_ID = 'uuid-template-1'

const mockAdmin = {
  id: 'mock-user-id',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
  clinicId: CLINIC_ID,
}

const mockProfessional = {
  id: 'mock-professional-id',
  fullName: 'Professional User',
  email: 'professional@clinic.com',
  role: 'professional',
  clinicId: CLINIC_ID,
}

const mockTemplate = {
  id: MOCK_TEMPLATE_ID,
  specialtyId: 'uuid-spec-1',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [
    { key: 'k1', label: 'Sintoma', type: 'text', required: true, order: 0, options: null, placeholder: null, helpText: null, canonical: false, canonicalKey: null },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const paginatedResponse = { data: [mockTemplate], total: 1, page: 1, limit: 20 }
const emptyPaginated = { data: [], total: 0, page: 1, limit: 20 }

describe('Medical Record Templates List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // O filtro de escopo lê as especialidades da clínica. Sem este stub a
    // chamada bate no backend com token mock, dá 401 e derruba a página inteira
    // num loop de redirect — a listagem nem chega a renderizar.
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*/specialties*`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'cs-1',
            clinicId: CLINIC_ID,
            specialtyId: 'uuid-spec-1',
            name: 'Cardiologia',
            description: null,
            linkedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      },
    }).as('getClinicSpecialties')
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/pulso/medical-record-templates')
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: paginatedResponse })
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.get('[data-testid="template-list-skeleton"]').should('be.visible')
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no templates exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: emptyPaginated,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-empty"]').should('be.visible')
    cy.get('[data-testid="template-list-table"]').should('not.exist')
  })

  it('shows error state when fetch fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-error"]').should('be.visible')
  })

  it('renders template table with correct data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')

    cy.get(`[data-testid="template-name-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Anamnese Cardíaca')
    cy.get(`[data-testid="template-specialty-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Cardiologia')
    cy.get(`[data-testid="template-status-${MOCK_TEMPLATE_ID}"]`).should('contain', 'Ativo')
  })

  // A listagem não paginava e o backend corta em 20 — com vários modelos por
  // especialidade, o resto sumia sem aviso nenhum.
  it('paginates through the templates', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: { ...paginatedResponse, total: 45 },
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')

    cy.get('[data-testid="template-list-page-info"]').should('contain', 'Página 1 de 3')
    cy.get('[data-testid="template-list-prev-page"]').should('be.disabled')

    cy.get('[data-testid="template-list-next-page"]').click()

    cy.wait('@getTemplates').its('request.url').should('contain', 'page=2')
    cy.get('[data-testid="template-list-page-info"]').should('contain', 'Página 2 de 3')
  })

  it('filters by specialty and by profession', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.wait('@getClinicSpecialties')

    cy.get('[data-testid="template-list-filter-scope"]').select('uuid-spec-1')
    cy.wait('@getTemplates').its('request.url').should('contain', 'specialtyId=uuid-spec-1')

    // Escopo por profissão e por especialidade são mutuamente exclusivos no
    // backend — o seletor é um só para a UI não pedir o que o servidor descarta.
    cy.get('[data-testid="template-list-filter-scope"]').select('generalist:crn')
    cy.wait('@getTemplates').then((interception) => {
      expect(interception.request.url).to.contain('councilType=crn')
      expect(interception.request.url).to.not.contain('specialtyId')
    })
  })

  it('shows new template button for ADMIN', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: emptyPaginated,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get('[data-testid="template-list-new-button"]').should('be.visible')
  })

  // Criar deixou de ser do profissional: o modelo é da clínica, e dois médicos
  // da mesma especialidade compartilham o mesmo. Gerir é do ADMIN.
  it('não mostra o botão de novo modelo para PROFESSIONAL', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockProfessional)
    cy.wait('@getTemplates')

    cy.get('[data-testid="template-list"]').should('be.visible')
    cy.get('[data-testid="template-list-new-button"]').should('not.exist')
  })

  it('view details link navigates to template page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: paginatedResponse,
    }).as('getTemplates')

    visitClinic('/medical-record-templates', mockAdmin)
    cy.wait('@getTemplates')
    cy.get(`[data-testid="template-view-link-${MOCK_TEMPLATE_ID}"]`).should(
      'have.attr',
      'href',
      `/pulso/medical-record-templates/${MOCK_TEMPLATE_ID}`,
    )
  })
})
