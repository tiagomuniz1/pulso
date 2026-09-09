import { MigrationInterface, QueryRunner } from 'typeorm'

export class AllowMultipleTemplatesPerScope1756500000000 implements MigrationInterface {
  name = 'AllowMultipleTemplatesPerScope1756500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // A clinic may now keep several templates for the same specialty (or the same
    // profession, for the generalist one) — "first appointment", "follow-up",
    // "prenatal" are different forms, and a single row forced one bloated model to
    // serve all of them. The professional picks which one to use when filling the
    // record, so the choice moved from the schema to the point of care.
    //
    // NOTE: "UQ_template_id_specialty" (a table CONSTRAINT, not one of these
    // indexes) is deliberately left alone. It backs the composite FK from
    // medical_records (template_id, specialty_id) and stays correct with N
    // templates, since id is the primary key.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_specialty"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_council_type"`)

    // The same pairs remain the read path for the picker (filtered by specialtyId
    // or councilType), so they are recreated as plain indexes.
    await queryRunner.query(`
      CREATE INDEX "IDX_template_clinic_specialty"
        ON "medical_record_templates" ("clinic_id", "specialty_id")
        WHERE "specialty_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_template_clinic_council_type"
        ON "medical_record_templates" ("clinic_id", "council_type")
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)

    // With no default template and an explicit choice every time, the name is the
    // only thing telling two templates of the same specialty apart on screen. Two
    // rows called "Retorno" would render as identical options and make the choice
    // impossible — so the name is unique within the scope that the picker lists.
    //
    // lower() because "retorno" and "Retorno" are the same name to a human; partial
    // on deleted_at so a deleted name can be reused, as elsewhere in the schema.
    // No backfill is needed: at most one row per scope exists today, so no
    // collision is possible.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_specialty_name"
        ON "medical_record_templates" ("clinic_id", "specialty_id", lower("name"))
        WHERE "specialty_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_council_type_name"
        ON "medical_record_templates" ("clinic_id", "council_type", lower("name"))
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_council_type_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_specialty_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_template_clinic_council_type"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_template_clinic_specialty"`)

    // Reverting assumes no clinic created a second template in the same scope after
    // this migration ran — if one did, these CREATEs fail by design rather than
    // silently deleting a clinic's template (same stance as 1754100000000).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
        ON "medical_record_templates" ("clinic_id", "specialty_id")
        WHERE "specialty_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_council_type"
        ON "medical_record_templates" ("clinic_id", "council_type")
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)
  }
}
