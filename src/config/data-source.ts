import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Shipment } from '../shipments/shipment.entity';

const isTsNode = __filename.endsWith('.ts');

const migrationPattern = isTsNode
  ? 'src/migrations/*.ts'
  : 'dist/migrations/*.js';

const databaseUrl = process.env.DATABASE_URL;

const baseOptions = databaseUrl
  ? {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'all_fretes',
    };

export default new DataSource({
  ...baseOptions,
  entities: [Account, Shipment],
  migrations: [migrationPattern],
  synchronize: false,
});
