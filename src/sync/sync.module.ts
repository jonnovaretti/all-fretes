import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AccountsModule } from '../accounts/accounts.module';
import { SYNC_TRACKS_QUEUE_NAME } from '../common/constants';
import { PlaywrightModule } from '../playwright/playwright.module';
import { TracksModule } from '../tracks/tracks.module';
import { SyncController } from './sync.controller';
import { SyncService, SYNC_QUEUE } from './sync.service';

@Module({
  imports: [AccountsModule, TracksModule, PlaywrightModule],
  controllers: [SyncController],
  providers: [
    {
      provide: SYNC_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const queueName = configService.get<string>(
          'queue.syncQueueName',
          SYNC_TRACKS_QUEUE_NAME
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
            maxRetriesPerRequest: null
          }
        });
      }
    },
    SyncService
  ],
  exports: [SyncService]
})
export class SyncModule {}
