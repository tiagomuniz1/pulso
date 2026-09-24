import { MigrationInterface, QueryRunner } from 'typeorm'

const TABLES = ['patients', 'appointments', 'medical_records'] as const

/**
 * Rastreio de origem para dados vindos de outro sistema (hoje, o IClinic).
 *
 * Mesma forma do `UQ_medications_import_hash`: índice único **parcial**, válido
 * só quando `external_id` está preenchido. Registro criado pela tela mantém a
 * coluna nula e nunca colide — e nulos são distintos entre si no Postgres, então
 * não há um "grupo dos sem origem" disputando a mesma chave.
 *
 * `clinic_id` entra na chave porque o mesmo paciente do sistema de origem pode
 * legitimamente existir em duas clínicas do Pulso (foi o caso das pacientes que
 * a Dra. Brenna e o Dr. Yago atendiam em comum).
 */
export class AddExternalOriginToImportedEntities1756700000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    for (const table of TABLES) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN "external_source" VARCHAR(20),
          ADD COLUMN "external_id"     VARCHAR(64)
      `)

      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_${table}_external_origin"
        ON "${table}" ("clinic_id", "external_source", "external_id")
        WHERE "external_id" IS NOT NULL AND "deleted_at" IS NULL
      `)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    for (const table of TABLES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "UQ_${table}_external_origin"`)
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "external_source",
          DROP COLUMN IF EXISTS "external_id"
      `)
    }
  }
}
