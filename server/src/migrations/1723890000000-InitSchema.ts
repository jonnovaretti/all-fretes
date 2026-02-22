import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1723890000000 implements MigrationInterface {
  name = 'InitSchema1723890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        login_url varchar NOT NULL,
        username varchar NOT NULL,
        password varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL,
        external_id varchar NOT NULL,
        title varchar NOT NULL,
        status varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_shipments_account FOREIGN KEY (account_id)
          REFERENCES accounts(id)
          ON DELETE CASCADE,
        CONSTRAINT uq_shipments_account_external UNIQUE (account_id, external_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS shipments;');
    await queryRunner.query('DROP TABLE IF EXISTS accounts;');
  }
}
