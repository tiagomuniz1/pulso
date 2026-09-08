import { EmailHealthIndicator } from './email-health.indicator'
import * as emailConfig from '../common/email/email-config.util'

describe('EmailHealthIndicator', () => {
  const indicator = new EmailHealthIndicator()

  function mockStatus(overrides: Partial<emailConfig.EmailConfigStatus> = {}) {
    jest.spyOn(emailConfig, 'resolveEmailConfigStatus').mockReturnValue({
      provider: 'smtp' as const,
      configured: true,
      missing: [],
      partialAuth: false,
      host: 'smtp.exemplo.com',
      port: 587,
      from: 'noreply@pulso.center',
      ...overrides,
    })
  }

  afterEach(() => jest.restoreAllMocks())

  it('reporta ok quando está configurado', () => {
    mockStatus()
    expect(indicator.check()).toEqual({
      status: 'ok',
      details: {
        email: {
          status: 'up',
          provider: 'smtp',
          configured: true,
          host: 'smtp.exemplo.com',
          port: 587,
          from: 'noreply@pulso.center',
        },
      },
    })
  })

  // O motivo no corpo é a razão de o endpoint existir: sem ele, o 503 diz
  // apenas "Service Unavailable" e ninguém sabe o que consertar.
  it('reporta erro dizendo o que falta', () => {
    mockStatus({ configured: false, missing: ['SMTP_HOST'], host: null })

    const result = indicator.check()

    expect(result.status).toBe('error')
    expect(result.details.email.status).toBe('down')
    expect(result.details.email.missing).toEqual(['SMTP_HOST'])
  })

  // Usuário sem senha quase sempre é engano de configuração, mas não impede a
  // tentativa — há relay que aceita conexão sem autenticação.
  it('avisa sobre autenticação pela metade sem reprovar o check', () => {
    mockStatus({ partialAuth: true })

    const result = indicator.check()

    expect(result.status).toBe('ok')
    expect(result.details.email.warning).toContain('SMTP_USER e SMTP_PASS')
  })

  it('omite o aviso quando a autenticação está coerente', () => {
    mockStatus()
    expect(indicator.check().details.email.warning).toBeUndefined()
  })

  // A resposta é pública: credencial não sai daqui de forma alguma.
  it('nunca expõe usuário nem senha', () => {
    jest.spyOn(emailConfig, 'resolveEmailConfigStatus').mockReturnValue({
      provider: 'smtp' as const,
      configured: true,
      missing: [],
      partialAuth: false,
      host: 'smtp.exemplo.com',
      port: 587,
      from: 'noreply@pulso.center',
    })
    const serializado = JSON.stringify(indicator.check()).toLowerCase()
    expect(serializado).not.toContain('user')
    expect(serializado).not.toContain('pass')
    expect(serializado).not.toContain('senha')
  })

  // Em produção o envio é pela API do SES, autenticado pela role da instância:
  // não há SMTP_HOST, e isso é o esperado, não defeito.
  it('reporta ok no SES sem host de SMTP', () => {
    mockStatus({ provider: 'ses', host: null })

    const result = indicator.check()

    expect(result.status).toBe('ok')
    expect(result.details.email.provider).toBe('ses')
    expect(result.details.email.host).toBeNull()
  })

  it('acusa remetente ausente no SES', () => {
    mockStatus({ provider: 'ses', configured: false, missing: ['SMTP_FROM'], host: null })

    const result = indicator.check()

    expect(result.status).toBe('error')
    expect(result.details.email.missing).toEqual(['SMTP_FROM'])
  })
})
