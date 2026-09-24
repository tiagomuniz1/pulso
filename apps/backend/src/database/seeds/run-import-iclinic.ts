import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { importIClinic } from './iclinic/import-iclinic'

/**
 * CLI da importação do IClinic.
 *
 * Molde de `run-import-medications.ts`: dotenv antes de tudo, `DataSource` cru
 * (sem Nest), lógica no `try`, `destroy()` no `finally`, código de saída
 * explícito. Compila para `dist/database/seeds/run-import-iclinic.js` e por isso
 * viaja na imagem de produção.
 *
 *   yarn workspace @app/backend import:iclinic \
 *     --dir=/caminho/do/export \
 *     --clinic-slug=brenna --professional-email=... \
 *     --orthopedics-clinic-slug=yago --orthopedics-professional-email=... \
 *     [--dry-run]
 */

interface CliArgs {
  dir?: string
  clinicSlug?: string
  professionalEmail?: string
  orthopedicsClinicSlug?: string
  orthopedicsProfessionalEmail?: string
  dryRun: boolean
}

const FLAGS: Record<string, keyof Omit<CliArgs, 'dryRun'>> = {
  '--dir': 'dir',
  '--clinic-slug': 'clinicSlug',
  '--professional-email': 'professionalEmail',
  '--orthopedics-clinic-slug': 'orthopedicsClinicSlug',
  '--orthopedics-professional-email': 'orthopedicsProfessionalEmail',
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }

    const [flag, inlineValue] = arg.includes('=') ? arg.split(/=(.*)/s) : [arg, undefined]
    const key = FLAGS[flag]
    if (!key) continue

    args[key] = inlineValue !== undefined ? inlineValue : argv[(index += 1)]
  }

  return args
}

function requireArg(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`Faltou ${flag}`)
  return value
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const options = {
    dir: requireArg(args.dir, '--dir'),
    clinicSlug: requireArg(args.clinicSlug, '--clinic-slug'),
    professionalEmail: requireArg(args.professionalEmail, '--professional-email'),
    orthopedicsClinicSlug: requireArg(args.orthopedicsClinicSlug, '--orthopedics-clinic-slug'),
    orthopedicsProfessionalEmail: requireArg(
      args.orthopedicsProfessionalEmail,
      '--orthopedics-professional-email',
    ),
    dryRun: args.dryRun,
    logger: (message: string) => console.log(message),
  }

  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  try {
    console.log(
      `[run-import-iclinic] ${options.dryRun ? 'SIMULAÇÃO' : 'CARGA'} a partir de ${options.dir}`,
    )
    await importIClinic(dataSource, options)
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[run-import-iclinic] Falhou:', error)
    process.exit(1)
  })
