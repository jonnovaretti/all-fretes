import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { AccountsService } from '../accounts/accounts.service';
import { SYNC_TRACKS_QUEUE_NAME } from '../common/constants';
import { GoFreteNavigatorService } from '../playwright/gofrete-navigator.service';
import { ParsedTrackRow, TracksService } from '../tracks/tracks.service';
import { parseBRDate, parseBRL } from './helpers/parse.helper';

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
    private readonly goFreteNavigatorService: GoFreteNavigatorService
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

    const pageNumber = 1;
    const pageSize = 10;
    const parsedTrackRow: ParsedTrackRow[] = [];
    const account = await this.accountsService.findOneOrFail(payload.accountId);

    const browser = await this.goFreteNavigatorService.createBrowser();

    const loggedPage = await this.goFreteNavigatorService.signInPage(browser, {
      loginUrl: account.loginUrl,
      username: account.username,
      password: account.password
    });

    let containsNoResultMessage =
      await this.goFreteNavigatorService.containsNoResultMessage(loggedPage);

    while (!containsNoResultMessage) {
      const tableRows =
        await this.goFreteNavigatorService.readTrackTableByStatus(
          loggedPage,
          'collected',
          {
            pageNumber,
            pageSize,
            orderBy: 'DESC',
            initialDate: ''
          }
        );

      const trackRows =
        await this.goFreteNavigatorService.extractTrackDataFromRows(tableRows);

      trackRows.forEach((t) => {
        parsedTrackRow.push({
          externalId: t.pedido,
          status: t.status,
          origin: t.origem,
          destination: t.destino,
          value: parseBRL(t.valor),
          openedAt: parseBRDate(t.criado),
          scheduled: t.prazo,
          invoiceCode: t.nfe
        });
      });

      await this.goFreteNavigatorService.goToNextPage(loggedPage);

      containsNoResultMessage =
        await this.goFreteNavigatorService.containsNoResultMessage(loggedPage);

      await loggedPage.screenshot({
        path: `debug-${Date.now()}.png`,
        fullPage: true
      });
    }

    const summary = await this.tracksService.upsertTracks(
      account.id,
      parsedTrackRow
    );

    this.logger.log(`Sync finished for account ${account.id}`);

    return {
      accountId: account.id,
      totalRows: parsedTrackRow.length,
      ...summary
    };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
