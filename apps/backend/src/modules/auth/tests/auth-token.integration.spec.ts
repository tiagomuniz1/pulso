import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000077'
const CLINIC_SLUG = 'seed-clinic-token'
const PASSWORD = 'Password123!'
const EMAIL_SUFFIX = '@token.test'

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

describe('Auth — credenciais para cliente nativo (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let email: string

  async function createUser(): Promise<string> {
    const address = `user.${faker.string.alphanumeric(8)}${EMAIL_SUFFIX}`
    await userRepository.save(
      userRepository.create({
        fullName: 'Profissional Teste',
        email: address,
        password: await bcrypt.hash(PASSWORD, 1),
        role: UserRole.ADMIN,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    return address
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Clínica Token',
        slug: CLINIC_SLUG,
        isActive: true,
      }),
    )
    email = await createUser()
  })

  // Só o que este spec criou — um DELETE amplo em `users` trava na FK de
  // `professionals` quando outro spec deixa linha para trás.
  afterEach(async () => {
    await userRepository.query(
      `DELETE FROM test.refresh_tokens WHERE user_id IN (SELECT id FROM test.users WHERE email LIKE '%${EMAIL_SUFFIX}')`,
    )
    await userRepository.query(`DELETE FROM test.users WHERE email LIKE '%${EMAIL_SUFFIX}'`)
    await clinicRepository.query('DELETE FROM test.clinics WHERE id = $1', [SEED_CLINIC_ID])
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /auth/token', () => {
    it('devolve os tokens no corpo, com o perfil', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: PASSWORD, slug: CLINIC_SLUG })
        .expect(200)

      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toEqual(expect.any(String))
      expect(body.user.email).toBe(email)
      expect(body.user.clinicId).toBe(SEED_CLINIC_ID)
      // Segundos, não milissegundos — o use-case devolve ms porque é o que o
      // cookie espera, e o controller converte.
      expect(body.expiresIn).toBe(900)
      expect(body.refreshTokenExpiresIn).toBe(604800)
    })

    // O cliente nativo não tem cookie jar; mandar Set-Cookie aqui só confundiria
    // quem depura, e abriria um caminho de sessão que ninguém usa.
    it('não emite cookie nenhum', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: PASSWORD, slug: CLINIC_SLUG })
        .expect(200)

      expect(response.headers['set-cookie']).toBeUndefined()
    })

    it('o accessToken devolvido autentica como Bearer', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: PASSWORD, slug: CLINIC_SLUG })
        .expect(200)

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200)

      expect(me.body.email).toBe(email)
      // O tenant vem do JWT: nenhum x-clinic-slug foi enviado.
      expect(me.body.clinicId).toBe(SEED_CLINIC_ID)
    })

    it('recusa credencial inválida', async () => {
      await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: 'ErradaErrada1!', slug: CLINIC_SLUG })
        .expect(401)
    })

    // A garantia que este endpoint existe para preservar: o fluxo de cookie da
    // web continua sem expor token no corpo. Se alguém "simplificar" unificando
    // os dois, este teste cai.
    it('/auth/login continua sem devolver token no corpo', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD, slug: CLINIC_SLUG })
        .expect(200)

      expect(body).not.toHaveProperty('accessToken')
      expect(body).not.toHaveProperty('refreshToken')
    })
  })

  describe('POST /auth/token/refresh', () => {
    async function getTokens(): Promise<{ accessToken: string; refreshToken: string }> {
      const { body } = await request(app.getHttpServer())
        .post('/auth/token')
        .send({ email, password: PASSWORD, slug: CLINIC_SLUG })
        .expect(200)
      return body
    }

    it('troca o refresh token do corpo por um par novo', async () => {
      const { refreshToken } = await getTokens()

      const { body } = await request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(body.accessToken).toEqual(expect.any(String))
      expect(body.refreshToken).toEqual(expect.any(String))
      expect(body.refreshToken).not.toBe(refreshToken)
      expect(body.expiresIn).toBe(900)
    })

    // A rotação é a proteção contra token roubado: usar o antigo depois de
    // trocar tem de falhar, ou a rotação não serve para nada.
    it('revoga o refresh token anterior', async () => {
      const { refreshToken } = await getTokens()

      await request(app.getHttpServer()).post('/auth/token/refresh').send({ refreshToken }).expect(200)
      await request(app.getHttpServer()).post('/auth/token/refresh').send({ refreshToken }).expect(401)
    })

    it('recusa um refresh token inventado', async () => {
      await request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({ refreshToken: 'nao-e-um-jwt' })
        .expect(401)
    })

    it('recusa um access token no lugar do refresh', async () => {
      const { accessToken } = await getTokens()

      await request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({ refreshToken: accessToken })
        .expect(401)
    })
  })

  // O guard é global, mas a suíte roda com THROTTLE_DISABLED=true (ver
  // tests/setup-integration-env.ts): milhares de requisições do mesmo IP e um
  // helper `loginAs` por spec derrubariam tudo em 429. Aqui a flag é religada
  // de propósito, que é a única forma de provar que o contador existe.
  describe('throttling (flag religada)', () => {
    beforeAll(() => {
      delete process.env.THROTTLE_DISABLED
    })

    afterAll(() => {
      process.env.THROTTLE_DISABLED = 'true'
    })

    it('barra a 11ª tentativa de /auth/token na mesma janela', async () => {
      const attempt = () =>
        request(app.getHttpServer())
          .post('/auth/token')
          .send({ email, password: PASSWORD, slug: CLINIC_SLUG })

      for (let i = 0; i < 10; i += 1) {
        await attempt().expect(200)
      }

      await attempt().expect(429)
    })
  })
})
