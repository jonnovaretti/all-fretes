import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_TRACKING_QUEUE_NAME } from '../common/constants';
import { GoFreteNavigatorService } from '../playwright/gofrete-navigator.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { parseBRDate, parseBRDateTime } from './helpers/parse.helper';

export const SYNC_TRACKING_QUEUE = 'SYNC_TRACKING_QUEUE';

interface SyncTrackingJobPayload {
  accountId: string;
}

@Injectable()
export class TrackingSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(TrackingSyncService.name);
  private readonly queueName: string;
  private readonly worker: Worker<SyncTrackingJobPayload>;

  constructor(
    @Inject(SYNC_TRACKING_QUEUE)
    private readonly queue: Queue<SyncTrackingJobPayload>,
    private readonly configService: ConfigService,
    private readonly accountsService: AccountsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly goFreteNavigatorService: GoFreteNavigatorService,
  ) {
    this.queueName = this.configService.get<string>(
      'queue.syncTrackingQueueName',
      SYNC_TRACKING_QUEUE_NAME,
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
          maxRetriesPerRequest: null,
        },
      },
    );

    this.worker.on('completed', (job, result) => {
      this.logger.log(
        `Job ${job.id} completed with result: ${JSON.stringify(result)}`,
      );
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed: ${error.message}`);
    });
  }

  async enqueue(accountId: string) {
    const job = await this.queue.add(
      'sync-tracking-job',
      { accountId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );

    return { jobId: job.id };
  }

  async handleSync(payload: SyncTrackingJobPayload) {
    this.logger.log(`Starting tracking sync for account ${payload.accountId}`);

    const account = await this.accountsService.findOneOrFail(payload.accountId);
    const shipments = await this.shipmentsService.findByAccountId(account.id);

    const browser = await this.goFreteNavigatorService.createBrowser();

    try {
      const loggedPage = await this.goFreteNavigatorService.signInPage(
        browser,
        {
          baseUrl: account.baseUrl,
          username: account.username,
          password: account.password,
        },
      );

      let synced = 0;

      for (const shipment of shipments) {
        await this.goFreteNavigatorService.goToTrackingPage(
          loggedPage,
          shipment.externalId,
        );

        const trackingEvent =
          await this.goFreteNavigatorService.extractTrackingDataFromPage(
            loggedPage,
          );

        const parsedTracking = trackingEvent.events.map((tracking) => ({
          notifiedAt: parseBRDateTime(tracking.date, tracking.time),
          status: tracking.status,
          statusDescription: tracking.description,
        }));

        await this.shipmentsService.updateShipmentTracking(shipment.id, {
          carrier: trackingEvent.carrier,
          estimatedDate: parseBRDate(trackingEvent.estimateDate),
          tracking: parsedTracking,
        });

        synced += 1;
      }

      this.logger.log(`Tracking sync finished for account ${account.id}`);

      return {
        accountId: account.id,
        totalShipments: shipments.length,
        synced,
      };
    } finally {
      await browser.close();
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
