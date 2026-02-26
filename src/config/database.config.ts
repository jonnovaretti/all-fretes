import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Shipment } from '../shipments/shipment.entity';
import { Tracking } from '../shipments/tracking.entity';
import { User } from '../users/user.entity';

export function createDataSourceOptions(
  configService?: ConfigService,
): DataSourceOptions {
  const databaseUrl =
    configService?.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [Account, Shipment, Tracking, User],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: true,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'postgres',
    host:
      configService?.get<string>('DB_HOST') ??
      process.env.DB_HOST ??
      'localhost',
    port: Number(
      configService?.get<string>('DB_PORT') ?? process.env.DB_PORT ?? 5432,
    ),
    username:
      configService?.get<string>('DB_USER') ??
      process.env.DB_USER ??
      'postgres',
    password:
      configService?.get<string>('DB_PASS') ??
      process.env.DB_PASS ??
      'postgres',
    database:
      configService?.get<string>('DB_NAME') ??
      process.env.DB_NAME ??
      'all_fretes',
    entities: [Account, Shipment, Tracking, User],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
  };
}

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    createDataSourceOptions(configService),
};
