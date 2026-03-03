import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDeliveryEstimateToTotalDaysEstimated1762200000000
  implements MigrationInterface
{
  name = 'RenameDeliveryEstimateToTotalDaysEstimated1762200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      DROP COLUMN IF EXISTS delivery_estimate;
    `);

    await queryRunner.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS total_days_estimated integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      DROP COLUMN IF EXISTS total_days_estimated;
    `);

    await queryRunner.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS delivery_estimate varchar NOT NULL DEFAULT '';
    `);
  }
}
