import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckedToShipments1762300000000 implements MigrationInterface {
  name = 'AddCheckedToShipments1762300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS checked boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments
      DROP COLUMN IF EXISTS checked;
    `);
  }
}
