import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_TRACKS_QUEUE_NAME } from '../common/constants';
import { PlaywrightService } from '../playwright/playwright.service';
import { TracksService } from '../tracks/tracks.service';

export const SYNC_QUEUE = 'SYNC_QUEUE';

interface SyncTracksJobPayload {
  accountId: string;
}

@Injectable()
export class SyncService implements OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private readonly queueName: string;
  private readonly worker: Worker<SyncTracksJobPayload>;

  constructor(
    @Inject(SYNC_QUEUE) private readonly queue: Queue<SyncTracksJobPayload>,
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly tracksService: TracksService,
    private readonly playwrightService: PlaywrightService
  ) {
    this.queueName = this.configService.get<string>(
      'queue.syncQueueName',
      SYNC_TRACKS_QUEUE_NAME
    );

    const redisConfig = this.configService.get<{
      host: string;
      port: number;
      username?: string;
      password?: string;
    }>('queue.redis');

    this.worker = new Worker(
      this.queueName,
      async (job) => this.handleSync(job.data),
      {
        concurrency: 2,
        connection: {
          host: redisConfig?.host,
          port: redisConfig?.port,
          username: redisConfig?.username,
          password: redisConfig?.password,
          maxRetriesPerRequest: null
        }
      }
    );

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `Job ${job.id} completed with result: ${JSON.stringify(result)}`
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });
  }

  async enqueue(accountId: string) {
    const job = await this.queue.add(
      'sync-tracks-job',
      { accountId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 50,
        removeOnFail: 50
      }
    );

    return { jobId: job.id };
  }

  async handleSync(payload: SyncTracksJobPayload) {
    this.logger.log(`Starting sync for account ${payload.accountId}`);

    const account = await this.accountsService.findOneOrFail(payload.accountId);
    const rows = await this.playwrightService.loginAndReadTracks(
      account.loginUrl,
      account.username,
      account.password
    );

    const summary = await this.tracksService.upsertTracks(account.id, rows);
    this.logger.log(`Sync finished for account ${account.id}`);

    return {
      accountId: account.id,
      totalRows: rows.length,
      ...summary
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
