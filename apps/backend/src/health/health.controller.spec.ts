import { HealthController } from './health.controller'
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus'
import { EmailHealthIndicator } from './email-health.indicator'

describe('HealthController', () => {
  let controller: HealthController
  let healthCheckService: jest.Mocked<HealthCheckService>
  let typeOrmHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>
  let emailHealthIndicator: jest.Mocked<EmailHealthIndicator>

  beforeEach(() => {
    typeOrmHealthIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as jest.Mocked<TypeOrmHealthIndicator>

    emailHealthIndicator = {
      check: jest.fn().mockReturnValue({ status: 'ok', details: { email: { status: 'up', provider: 'smtp' } } }),
    } as unknown as jest.Mocked<EmailHealthIndicator>

    healthCheckService = {
      check: jest.fn().mockImplementation((fns: (() => any)[]) =>
        Promise.all(fns.map((fn) => fn())),
      ),
    } as unknown as jest.Mocked<HealthCheckService>

    controller = new HealthController(
      healthCheckService,
      typeOrmHealthIndicator,
      emailHealthIndicator,
    )
  })

  it('calls health.check with database ping', async () => {
    await controller.check()

    expect(healthCheckService.check).toHaveBeenCalled()
    expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database')
  })

  // O healthcheck do container aponta para GET /health. Se o e-mail entrar
  // aqui, SMTP ausente marca a instância como doente e a põe em ciclo de
  // restart — com o sistema perfeitamente capaz de atender consulta.
  it('não inclui o e-mail no health que gateia o container', async () => {
    await controller.check()

    expect(emailHealthIndicator.check).not.toHaveBeenCalled()
  })

  it('checa o e-mail no endpoint separado, sem tocar o banco', () => {
    const res = { status: jest.fn() } as any

    controller.checkEmail(res)

    expect(emailHealthIndicator.check).toHaveBeenCalled()
    expect(typeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled()
  })

  it('responde 200 quando o e-mail está configurado', () => {
    const res = { status: jest.fn() } as any

    controller.checkEmail(res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  // Status não-200 para o alarme casar sem precisar interpretar o corpo.
  it('responde 503 quando o e-mail não está configurado', () => {
    emailHealthIndicator.check.mockReturnValue({
      status: 'error',
      details: { email: { status: 'down', provider: 'smtp', configured: false, host: null, port: 587, from: 'x', missing: ['SMTP_HOST'] } },
    })
    const res = { status: jest.fn() } as any

    const result = controller.checkEmail(res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(result.details.email.missing).toEqual(['SMTP_HOST'])
  })
})
