import { DataSource } from 'typeorm'
import * as path from 'path'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '900s'
process.env.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION ?? '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'

export default async function globalSetup() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    schema: 'test',
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../../migrations/*{.ts,.js}')],
    synchronize: false,
  })

  await dataSource.initialize()
  await dataSource.runMigrations()
  await truncateAllTables(dataSource)
  await dataSource.destroy()
}

/**
 * Zera o schema antes da suíte.
 *
 * O schema `test` sobrevive entre execuções — só as migrations rodavam aqui,
 * nunca uma limpeza. Cada spec limpa o que cria no próprio `afterAll`, mas
 * quando um deles falha no meio o resto do arquivo não roda, e a execução
 * seguinte começa suja. Era essa a origem da instabilidade: a suíte falhava
 * num spec diferente a cada vez, sempre passando quando rodada isolada.
 *
 * `CASCADE` porque a ordem entre as tabelas não importa aqui — e ela mudaria
 * a cada chave estrangeira nova, o que faria esta função apodrecer sozinha.
 *
 * A tabela `migrations` fica de fora: apagá-la faria a próxima execução tentar
 * aplicar tudo de novo sobre um schema que já existe.
 */
async function truncateAllTables(dataSource: DataSource): Promise<void> {
  const tabelas: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'test' AND tablename <> 'migrations'`,
  )
  if (tabelas.length === 0) return

  const lista = tabelas.map(({ tablename }) => `"test"."${tablename}"`).join(', ')
  await dataSource.query(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`)
}
