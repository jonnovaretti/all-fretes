import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersTable1723900000000 implements MigrationInterface {
  name = 'AddUsersTable1723900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        email varchar NOT NULL UNIQUE,
        password varchar NOT NULL,
        admin boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS users;');
  }
}
