import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLabelIdToAppointments1756600000001 implements MigrationInterface {
  name = 'AddLabelIdToAppointments1756600000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // SET NULL é a convenção do projeto para referência opcional e decorativa
    // (o mesmo de clinics.theme_id). CASCADE apagaria consultas por causa de um
    // rótulo; RESTRICT travaria o cascade da clínica sem proteger nada, porque
    // um rótulo ausente não corrompe o registro da consulta.
    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD COLUMN IF NOT EXISTS "label_id" uuid,
        ADD CONSTRAINT "FK_appointments_label" FOREIGN KEY ("label_id")
          REFERENCES "appointment_labels"("id") ON DELETE SET NULL
    `)

    // Parcial: rótulo é opcional e a maioria das consultas não terá nenhum. O
    // índice serve ao filtro da agenda, e indexar a maioria nula seria desperdício.
    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_label" ON "appointments" ("label_id")
        WHERE "label_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_label"`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_label"`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "label_id"`)
  }
}
