import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { devSeed } from './dev/dev.seed'

async function run() {
  // O schema `test` pertence à suíte de integração, que monta e desmonta o
  // próprio cenário. Rodar o seed de desenvolvimento nele renomeia a clínica
  // usada pelos specs (para "Pulso") e derruba dezenas de testes — num spec
  // diferente a cada execução, porque o schema sobrevive entre elas. Foi o que
  // aconteceu, e diagnosticar custou caro.
  // Mesma resolução de `database.config.ts` — `DataSourceOptions` é união e não
  // expõe `schema` em todas as variantes.
  const schema = process.env.DB_SCHEMA ?? (process.env.NODE_ENV === 'test' ? 'test' : 'dev')

  if (schema === 'test') {
    throw new Error(
      'O seed de desenvolvimento não roda no schema `test`: ele é da suíte de integração, ' +
        'que cria o próprio cenário. Rode sem NODE_ENV=test, ou aponte DB_SCHEMA para outro schema.',
    )
  }

  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()
  await devSeed(dataSource)
  await dataSource.destroy()
}

run()
  .then(() => {
    console.log('Seed completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
