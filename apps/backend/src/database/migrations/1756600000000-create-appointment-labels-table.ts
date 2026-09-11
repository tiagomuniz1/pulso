import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAppointmentLabelsTable1756600000000 implements MigrationInterface {
  name = 'CreateAppointmentLabelsTable1756600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "appointment_labels" (
        "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"  uuid        NOT NULL,
        "name"       varchar(40) NOT NULL,
        "color"      varchar(30) NOT NULL,
        "is_active"  boolean     NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "FK_appointment_labels_clinic" FOREIGN KEY ("clinic_id")
          REFERENCES "clinics"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointment_labels_clinic"
        ON "appointment_labels" ("clinic_id") WHERE "deleted_at" IS NULL
    `)

    // O rótulo aparece na agenda como cor cujo único texto é o nome: dois
    // "Retorno" seriam duas linhas idênticas no seletor e na legenda, e o ADMIN
    // não saberia qual editar. lower() porque "retorno" e "Retorno" são a mesma
    // palavra; parcial em deleted_at para um nome excluído poder ser recadastrado.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointment_labels_clinic_name"
        ON "appointment_labels" ("clinic_id", lower("name")) WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_appointment_labels_clinic_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointment_labels_clinic"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_labels"`)
  }
}
