import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsolidatedStatusToShipments1762100000000
  implements MigrationInterface
{
  name = 'AddConsolidatedStatusToShipments1762100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS consolidated_status varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      DROP COLUMN IF EXISTS consolidated_status;
    `);
  }
}
