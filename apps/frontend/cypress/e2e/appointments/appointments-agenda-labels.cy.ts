// A agenda colorida por rótulo — o cenário que motivou a funcionalidade: a
// médica bate o olho e sabe qual consulta está olhando.

import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const CLINIC_ID = '10000000-0000-4000-8000-000000000000'
const LABEL_RETORNO = '00000000-0000-4000-a000-000000000001'
const LABEL_PRENATAL = '00000000-0000-4000-a000-000000000002'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: CLINIC_ID,
}

const mockProfessional = {
  id: DOC_UUID,
  user: { id: 'professional-user-uuid', fullName: 'Dr. Test', email: 'professional@pulso.center', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
}

const labels = [
  { id: LABEL_RETORNO, name: 'Retorno', color: 'green', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
  { id: LABEL_PRENATAL, name: 'Pré-natal', color: 'rose', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
]

const DATA = '2099-06-01'

function consulta(id: string, startTime: string, label: unknown) {
  return {
    id,
    professionalId: DOC_UUID,
    professionalName: 'Dr. Test',
    patientId: `p-${id}`,
    patientName: `Paciente ${id}`,
    specialtyId: null,
    specialtyName: null,
    scheduleId: 'sched',
    date: DATA,
    startTime,
    endTime: '09:00',
    status: 'scheduled',
    insuranceType: null,
    reason: null,
    cancellationReason: null,
    seriesId: null,
    seriesSequence: null,
    seriesTotalOccurrences: null,
    label,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  }
}

const consultas = [
  consulta('a', '08:00', { id: LABEL_RETORNO, name: 'Retorno', color: 'green' }),
  consulta('b', '08:30', { id: LABEL_PRENATAL, name: 'Pré-natal', color: 'rose' }),
  consulta('c', '09:00', null),
]

describe('Agenda — rótulos', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: mockProfessional })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: { data: [mockProfessional], total: 1, page: 1, limit: 200 } })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointment-labels*`, { statusCode: 200, body: { data: labels, total: 2, page: 1, limit: 100 } }).as('getLabels')
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, {
      statusCode: 200,
      // Um horário livre no MESMO horário de uma consulta: é o que prova que o
      // filtro não faz o ocupado reaparecer como livre.
      body: { professionalId: DOC_UUID, date: DATA, slots: [{ startTime: '08:00', endTime: '08:30' }] },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, { statusCode: 200, body: { data: consultas, total: 3, page: 1, limit: 100 } })
    // O glob acima NÃO cobre `/appointments/:id` — no minimatch o `*` não
    // atravessa a barra. É por essa rota que o diálogo de detalhes carrega, e
    // sem stub a chamada dá 401 e o app redireciona para o login.
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/*`, (req) => {
      if (req.url.includes('availability')) return
      const id = req.url.split('/appointments/')[1]!.split('?')[0]!
      const encontrada = consultas.find((c) => c.id === id) ?? consultas[0]!
      req.reply({
        statusCode: 200,
        body: {
          ...encontrada,
          patient: {
            fullName: encontrada.patientName, email: 'p@x.com', phoneNumber: '11999990000',
            birthDate: '1990-01-01', documentNumber: '12345678901', gender: 'female',
          },
          seriesFutureCount: null,
        },
      })
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 200 } })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  function abrirDia(query = '') {
    visitClinic(`/appointments?date=${DATA}&view=day${query}`, mockProfessionalUser)
    cy.get('[data-testid="agenda-day-grid"]', { timeout: 10000 }).should('exist')
  }

  it('pinta a faixa na cor do rótulo, na visão dia', () => {
    abrirDia()

    cy.get('[data-testid="agenda-slot-booked"]')
      .first()
      .find('[data-testid="agenda-slot-label"]')
      .should('be.visible')
      .and('have.attr', 'data-label-color', 'green')
  })

  it('pinta a faixa também na visão semana, onde o espaço é apertado', () => {
    visitClinic(`/appointments?date=${DATA}&view=week`, mockProfessionalUser)

    cy.get('[data-testid="agenda-week-grid"]', { timeout: 10000 }).should('exist')
    cy.get('[data-testid="agenda-slot-label"]').first().should('be.visible')
  })

  it('consulta sem rótulo não tem faixa', () => {
    abrirDia()

    cy.contains('[data-testid="agenda-slot-booked"]', 'Paciente c')
      .find('[data-testid="agenda-slot-label"]')
      .should('not.exist')
  })

  it('a legenda mostra os rótulos do catálogo', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.get('[data-testid="agenda-label-legend"]').should('be.visible')
    cy.get(`[data-testid="agenda-label-legend-item-${LABEL_RETORNO}"]`).should('contain.text', 'Retorno')
    cy.get(`[data-testid="agenda-label-legend-item-${LABEL_PRENATAL}"]`).should('contain.text', 'Pré-natal')
  })

  it('filtrar por um rótulo esconde as demais consultas', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.get('[data-testid="toolbar-label-select"]').select(LABEL_RETORNO)

    cy.get('[data-testid="agenda-slot-booked"]').should('have.length', 1)
    cy.contains('[data-testid="agenda-slot-booked"]', 'Paciente a').should('exist')
  })

  it('filtrar por "Sem rótulo" mostra só as que não têm', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.get('[data-testid="toolbar-label-select"]').select('none')

    cy.get('[data-testid="agenda-slot-booked"]').should('have.length', 1)
    cy.contains('[data-testid="agenda-slot-booked"]', 'Paciente c').should('exist')
  })

  // A REGRESSÃO que justifica o filtro ser no cliente: se ele fosse no servidor,
  // a consulta sumiria do payload e o horário voltaria como "Livre — clique para
  // agendar" por cima de uma consulta existente. A recepção agendaria em cima.
  it('sob filtro, um horário ocupado escondido NÃO reaparece como livre', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.get('[data-testid="toolbar-label-select"]').select(LABEL_PRENATAL)

    cy.get('[data-testid="agenda-slot-free"]').should('not.exist')
    cy.get('[data-testid="agenda-slot-booked"]').should('have.length', 1)
  })

  it('o filtro entra na URL e sai ao voltar para todos', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.get('[data-testid="toolbar-label-select"]').select(LABEL_RETORNO)
    cy.location('search').should('include', `label=${LABEL_RETORNO}`)

    cy.get('[data-testid="toolbar-label-select"]').select('')
    cy.location('search').should('not.include', 'label=')
  })

  it('abre já filtrada quando a URL traz o rótulo', () => {
    abrirDia(`&label=${LABEL_RETORNO}`)
    cy.wait('@getLabels')

    cy.get('[data-testid="toolbar-label-select"]').should('have.value', LABEL_RETORNO)
    cy.get('[data-testid="agenda-slot-booked"]').should('have.length', 1)
  })

  it('avisa quando nenhuma consulta do dia tem o rótulo escolhido', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, {
      statusCode: 200,
      body: { data: [consulta('c', '09:00', null)], total: 1, page: 1, limit: 100 },
    })
    // Sem `abrirDia`: com tudo filtrado o grid não chega a existir, o
    // componente devolve só o estado vazio.
    visitClinic(`/appointments?date=${DATA}&view=day&label=${LABEL_RETORNO}`, mockProfessionalUser)

    cy.get('[data-testid="agenda-day-empty-filtered"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="agenda-day-empty"]').should('not.exist')
  })

  // A coluna de valor do `<dl>` do diálogo tem cerca de 190px. Uma pílula
  // repetindo o nome que o select já mostra transbordava; ficou uma amostra de
  // cor. Medir é o único jeito de pegar isto — `be.visible` passa mesmo com o
  // conteúdo vazando.
  it('a linha do rótulo cabe na coluna do diálogo de detalhes', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.contains('[data-testid="agenda-slot-booked"]', 'Paciente a').click()
    cy.get('[data-testid="details-label-select"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="details-label"]').then(($dd) => {
      const coluna = $dd[0]!.getBoundingClientRect()
      const filhos = [...$dd[0]!.querySelectorAll('select, [data-testid="appointment-label-swatch"]')]
      for (const filho of filhos) {
        const caixa = filho.getBoundingClientRect()
        expect(
          Math.round(caixa.right) <= Math.round(coluna.right) + 1,
          `"${filho.getAttribute('data-testid') ?? filho.tagName}" transborda a coluna ` +
            `(direita ${Math.round(caixa.right)} contra ${Math.round(coluna.right)})`,
        ).to.eq(true)
      }
    })

    cy.get('[data-testid="appointment-label-swatch"]')
      .should('be.visible')
      .and('have.attr', 'data-label-color', 'green')
  })

  // O modal inteiro não pode ganhar rolagem horizontal por causa da linha nova.
  it('o diálogo não ganha rolagem horizontal', () => {
    abrirDia()
    cy.wait('@getLabels')

    cy.contains('[data-testid="agenda-slot-booked"]', 'Paciente a').click()
    cy.get('[data-testid="details-label-select"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="appointment-details-dialog"]').then(($modal) => {
      const el = $modal[0]!
      expect(el.scrollWidth, 'o modal rola na horizontal').to.be.at.most(el.clientWidth + 1)
    })
  })

  describe('no mobile', () => {
    beforeEach(() => cy.viewport(375, 700))

    // No toque não existe hover, então o `title` do bloco não ajuda: sem a
    // legenda a cor ficaria sem chave nenhuma, que é o oposto de "bater o olho
    // e saber".
    it('mostra a legenda, que no desktop é o único apoio junto do hover', () => {
      abrirDia()
      cy.wait('@getLabels')

      cy.get('[data-testid="agenda-label-legend"]').should('be.visible')
      cy.get(`[data-testid="agenda-label-legend-item-${LABEL_RETORNO}"]`).should('contain.text', 'Retorno')
    })

    // Embrulhada, oito rótulos custavam 76px de uma tela de 700px, sobre uma
    // barra que já tem 152px. Numa linha só, custa um terço disso.
    it('cabe numa linha e desliza em vez de embrulhar', () => {
      abrirDia()
      cy.wait('@getLabels')

      cy.get('[data-testid="agenda-label-legend"]').then(($l) => {
        const el = $l[0]!
        expect(Math.round(el.getBoundingClientRect().height), 'a legenda embrulhou').to.be.lessThan(45)
      })
    })

    // Espremida, a pílula deixa o nome vazar do fundo colorido — foi assim que
    // o rótulo ao lado do select quebrou no diálogo.
    it('não espreme as pílulas a ponto do nome vazar', () => {
      abrirDia()
      cy.wait('@getLabels')

      cy.get('[data-testid^="agenda-label-legend-item-"]').each(($pill) => {
        const el = $pill[0]!
        expect(el.scrollWidth, `"${el.textContent}" teve o texto cortado`).to.be.at.most(
          el.clientWidth + 1,
        )
      })
    })

    // O espaçamento abaixo é do bloco inteiro. Quando morava só no `<div>` da
    // barra, a legenda entrava depois dele e encostava na agenda — folga zero.
    it('não fica colada na agenda', () => {
      abrirDia()
      cy.wait('@getLabels')

      cy.document().then((d) => {
        const legenda = d.querySelector('[data-testid="agenda-label-legend"]')!.getBoundingClientRect()
        const grid = d.querySelector('[data-testid="agenda-day-grid"]')!.getBoundingClientRect()
        const folga = Math.round(grid.top - legenda.bottom)
        expect(folga, `a legenda está a ${folga}px da agenda`).to.be.at.least(12)
      })
    })

    // A rolagem é da legenda, não da página: o corpo não pode andar de lado.
    // Precisa de catálogo cheio — com dois rótulos tudo cabe e nada desliza.
    it('a rolagem fica na legenda e não na página', () => {
      const catalogoCheio = [
        ...labels,
        { id: 'x1', name: 'Retorno anual', color: 'blue', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: 'x2', name: 'Encaixe', color: 'bronze', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: 'x3', name: 'Urgência', color: 'red', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: 'x4', name: 'Teleconsulta', color: 'petrol', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: 'x5', name: 'Exame', color: 'violet', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
        { id: 'x6', name: 'Convênio', color: 'slate', isActive: true, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
      ]
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointment-labels*`, {
        statusCode: 200,
        body: { data: catalogoCheio, total: catalogoCheio.length, page: 1, limit: 100 },
      }).as('getLabelsCheio')

      abrirDia()
      cy.wait('@getLabelsCheio')

      cy.get('[data-testid="agenda-label-legend"]').then(($l) => {
        expect($l[0]!.scrollWidth, 'a legenda deveria deslizar').to.be.greaterThan($l[0]!.clientWidth)
      })
      cy.document().then((d) => {
        expect(d.documentElement.scrollWidth, 'a página rola na horizontal').to.be.at.most(
          d.documentElement.clientWidth + 1,
        )
      })
    })
  })
})
