import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountsModule } from './accounts/accounts.module';
import { appConfig } from './config/app.config';
import { queueConfig } from './config/queue.config';
import { typeOrmConfig } from './config/database.config';
import { SyncModule } from './sync/sync.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, queueConfig]
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    AccountsModule,
    ShipmentsModule,
    SyncModule,
    HealthModule
  ]
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.dataSource.runMigrations();
  }
}
