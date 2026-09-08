import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { Response } from 'express'
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus'
import { Public } from '../modules/auth/decorators/public.decorator'
import { EmailHealthIndicator } from './email-health.indicator'

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly email: EmailHealthIndicator,
  ) {}

  // O healthcheck do container aponta para cá (docker-compose.prod.yml).
  // Só entra aqui o que, estando fora, torna a instância inservível.
  @Get()
  @HealthCheck()
  @Public()
  check() {
    return this.health.check([
      () => this.database.pingCheck('database'),
    ])
  }

  // Diagnóstico separado, DE PROPÓSITO. E-mail quebrado não pode marcar a
  // instância como doente: o sistema segue atendendo consulta e emitindo
  // documento sem ele, e um restart em ciclo por causa disso seria pior que o
  // defeito. Responde 503 quando não está configurado, para dar um alarme
  // fácil de montar sem gatear o container.
  @Get('email')
  @Public()
  checkEmail(@Res({ passthrough: true }) res: Response) {
    const result = this.email.check()
    // 503 quando não está configurado, para o alarme ser trivial de montar —
    // e o corpo carrega o motivo, que é o que faz o endpoint valer a pena.
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
    return result
  }
}
