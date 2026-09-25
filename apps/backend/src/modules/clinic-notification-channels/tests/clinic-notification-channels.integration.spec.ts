import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { Repository } from 'typeorm'
import { NotificationChannel, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { ClinicNotificationChannel } from '../entities/clinic-notification-channel.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000042'
const CLINIC_SLUG = 'seed-clinic-channels'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('ClinicNotificationChannelsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let channelRepository: Repository<ClinicNotificationChannel>
  let platformAdminToken: string
  let adminToken: string
  let clinicId: string

  async function loginAsPlatformAdmin(): Promise<string> {
    const password = 'Password123!'
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Platform Admin',
        email: `platform.${faker.string.alphanumeric(6)}@channels.test`,
        password: await bcrypt.hash(password, 1),
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith('access_token='))
    return match ? match.slice('access_token='.length).split(';')[0] : ''
  }

  async function loginAsClinicUser(role: UserRole): Promise<string> {
    const password = 'Password123!'
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Clinic ${role}`,
        email: `${role}.${faker.string.alphanumeric(6)}@channels.test`,
        password: await bcrypt.hash(password, 1),
        role,
        clinicId,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: CLINIC_SLUG })

    const cookieName = `access_token_${CLINIC_SLUG}=`
    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith(cookieName))
    return match ? match.slice(cookieName.length).split(';')[0] : ''
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    channelRepository = module.get(getRepositoryToken(ClinicNotificationChannel))
  })

  beforeEach(async () => {
    const clinic = await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Seed Clinic Channels',
        slug: CLINIC_SLUG,
        isActive: true,
      }),
    )
    clinicId = clinic.id
    platformAdminToken = await loginAsPlatformAdmin()
    adminToken = await loginAsClinicUser(UserRole.ADMIN)
  })

  // Apaga só o que este spec criou. Um DELETE amplo em `users` trava na FK de
  // `professionals` sempre que outro spec deixa um profissional para trás — e
  // ao estourar aqui, deixa a clínica e os usuários deste spec no schema,
  // quebrando o próximo. Escopar é o que torna o spec independente.
  afterEach(async () => {
    await channelRepository.query('DELETE FROM test.clinic_notification_channels WHERE clinic_id = $1', [
      SEED_CLINIC_ID,
    ])
    await userRepository.query(
      `DELETE FROM test.refresh_tokens WHERE user_id IN (SELECT id FROM test.users WHERE email LIKE '%@channels.test')`,
    )
    await userRepository.query(`DELETE FROM test.users WHERE email LIKE '%@channels.test'`)
    await clinicRepository.query('DELETE FROM test.clinics WHERE id = $1', [SEED_CLINIC_ID])
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /clinics/:clinicId/notification-channels/:channel', () => {
    it('enables the channel for the clinic', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      expect(body.clinicId).toBe(clinicId)
      expect(body.channel).toBe(NotificationChannel.WHATSAPP)
      expect(body.enabledAt).toBeDefined()

      const rows = await channelRepository.findBy({ clinicId })
      expect(rows).toHaveLength(1)
    })

    it('409s when the channel is already enabled', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(201)

      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(409)
    })

    // An unknown channel must die at the edge, not land in the DB as a varchar
    // no adapter can dispatch.
    it('400s for a channel outside the enum', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/notification-channels/telegram`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400)
    })

    it('404s for a clinic that does not exist', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${faker.string.uuid()}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    // Enabling is a platform decision — the clinic's own admin cannot grant it
    // to itself.
    it('403s for the clinic ADMIN', async () => {
      await request(app.getHttpServer())
        .post(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .expect(403)
    })
  })

  describe('GET /clinics/:clinicId/notification-channels', () => {
    it('lists what is enabled', async () => {
      await channelRepository.save(
        channelRepository.create({ clinicId, channel: NotificationChannel.WHATSAPP }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/notification-channels`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
      expect(body[0].channel).toBe(NotificationChannel.WHATSAPP)
    })

    it('returns an empty list for a clinic that opted into nothing', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/notification-channels`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })

    // The clinic may read what is active for it, even though it cannot change it.
    it('allows the clinic ADMIN to read', async () => {
      await request(app.getHttpServer())
        .get(`/clinics/${clinicId}/notification-channels`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .expect(200)
    })
  })

  describe('DELETE /clinics/:clinicId/notification-channels/:channel', () => {
    it('disables the channel', async () => {
      await channelRepository.save(
        channelRepository.create({ clinicId, channel: NotificationChannel.WHATSAPP }),
      )

      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      expect(await channelRepository.findBy({ clinicId })).toHaveLength(0)
    })

    it('404s when the channel was never enabled', async () => {
      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('403s for the clinic ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/clinics/${clinicId}/notification-channels/${NotificationChannel.WHATSAPP}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-clinic-slug', CLINIC_SLUG)
        .expect(403)
    })
  })
})
