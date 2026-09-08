import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health.controller'
import { EmailHealthIndicator } from './email-health.indicator'

@Module({
  imports: [TerminusModule, TypeOrmModule],
  controllers: [HealthController],
  providers: [EmailHealthIndicator],
})
export class HealthModule {}
