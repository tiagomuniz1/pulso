import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Per-clinic opt-in for patient notifications, plus the unique-key change that
 * multi-channel forces on appointment_reminders.
 *
 * Until now the reminder cron was cross-clinic: it swept every active clinic and
 * the only switch was the global REMINDERS_ENABLED. Turning it on would have made
 * every clinic — including ones onboarded later — start messaging patients
 * without anyone deciding it. A row here is that decision, made per clinic and
 * per channel by the PLATFORM_ADMIN.
 */
export class CreateClinicNotificationChannelsTable1756800000000 implements MigrationInterface {
  name = 'CreateClinicNotificationChannelsTable1756800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // The row existing IS the enablement — no is_enabled column and no soft
    // delete, matching clinic_specialties. Enabling is an INSERT, disabling a
    // DELETE, which keeps the state space at two instead of four.
    await queryRunner.query(`
      CREATE TABLE "clinic_notification_channels" (
        "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"  uuid        NOT NULL,
        "channel"    varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_clinic_notification_channels_clinic" FOREIGN KEY ("clinic_id")
          REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_clinic_notification_channels_clinic_channel" UNIQUE ("clinic_id", "channel")
      )
    `)

    await queryRunner.query(
      `CREATE INDEX "IDX_clinic_notification_channels_clinic" ON "clinic_notification_channels" ("clinic_id")`,
    )

    // The send-once key has to include the channel. Without it, sending on
    // WhatsApp claims the (appointment, offset) slot and a second channel can
    // never send for the same reminder — the claim returns null and the use-case
    // reads that as "already handled by another instance", silently.
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" DROP CONSTRAINT IF EXISTS "UQ_appointment_reminders_appointment_offset"`,
    )
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" ADD CONSTRAINT "UQ_appointment_reminders_appointment_offset_channel" UNIQUE ("appointment_id", "offset_label", "channel")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Reverting narrows the key, so it can fail on rows that only coexist under
    // the wider one (same appointment+offset on two channels). Deliberate: the
    // duplicates have to be resolved by hand rather than silently dropped.
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" DROP CONSTRAINT IF EXISTS "UQ_appointment_reminders_appointment_offset_channel"`,
    )
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" ADD CONSTRAINT "UQ_appointment_reminders_appointment_offset" UNIQUE ("appointment_id", "offset_label")`,
    )

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clinic_notification_channels_clinic"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "clinic_notification_channels"`)
  }
}
