import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AccountsModule } from '../accounts/accounts.module';
import {
  SYNC_SHIPMENTS_QUEUE_NAME,
  SYNC_TRACKING_QUEUE_NAME,
} from '../common/constants';
import { PlaywrightModule } from '../playwright/playwright.module';
import { ShipmentsModule } from '../shipments/shipments.module';
import { ShipmentSyncService, SYNC_QUEUE } from './shipment-sync.service';
import { SyncController } from './sync.controller';
import {
  SYNC_TRACKING_QUEUE,
  TrackingSyncService,
} from './tracking-sync.service';

@Module({
  imports: [AccountsModule, ShipmentsModule, PlaywrightModule],
  controllers: [SyncController],
  providers: [
    {
      provide: SYNC_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueName = configService.get<string>(
          'queue.syncQueueName',
          SYNC_SHIPMENTS_QUEUE_NAME,
        );
        const redis = configService.get<{
          host: string;
          port: number;
          username?: string;
          password?: string;
        }>('queue.redis');

        return new Queue(queueName, {
          connection: {
            host: redis?.host,
            port: redis?.port,
            username: redis?.username,
            password: redis?.password,
            maxRetriesPerRequest: null,
          },
        });
      },
    },
    {
      provide: SYNC_TRACKING_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueName = configService.get<string>(
          'queue.syncTrackingQueueName',
          SYNC_TRACKING_QUEUE_NAME,
        );
        const redis = configService.get<{
          host: string;
          port: number;
          username?: string;
          password?: string;
        }>('queue.redis');

        return new Queue(queueName, {
          connection: {
            host: redis?.host,
            port: redis?.port,
            username: redis?.username,
            password: redis?.password,
            maxRetriesPerRequest: null,
          },
        });
      },
    },
    ShipmentSyncService,
    TrackingSyncService,
  ],
  exports: [ShipmentSyncService, TrackingSyncService],
})
export class SyncModule {}
