import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenToUsers1760000000000
  implements MigrationInterface
{
  name = 'AddRefreshTokenToUsers1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS refresh_token_hash varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS refresh_token_hash;
    `);
  }
}
